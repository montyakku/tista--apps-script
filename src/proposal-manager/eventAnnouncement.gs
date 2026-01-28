// 共通定数はutils.gsで定義済み

// テンプレートファイル設定
const EVENT_ANNOUNCEMENT_TEMPLATES = {
  BODY: {
    FILE_ID: "1sJQ2pcm9iuC88gbAipzIFLP8CPwR4c7f",
    NEWLINE: "<br />"
  },
  MAIL: {
    FILE_ID: "1p7sdbnPZEWrDxzPWSDOpT63nbje8nXea",
    NEWLINE: "<br />"
  },
  DAY_OF: {
    FILE_ID: "1naPnuFyaMQQlJj1ZhVLbmnLWhmZ114JJ",
    NEWLINE: "\n"
  },
  SPOT: {
    FILE_ID: "1oQTn_hMbvxcLAlb5sV6QBZu1UsYs1Y6X",
    NEWLINE: "\n"
  }
};

/**
 * 開催告知キャンペーンを実行
 * マッピング取得→テンプレート生成→キャンペーン作成を一気通貫で実行
 */
function eventAnnouncementRun() {
  Logger.log('=== EventAnnouncement: 開催告知キャンペーン作成開始 ===');

  // 1. マッピングデータを取得
  const mapping = getMappingData();

  // 2. テンプレート生成
  processTemplateFile(EVENT_ANNOUNCEMENT_TEMPLATES.BODY.FILE_ID, mapping, EVENT_ANNOUNCEMENT_TEMPLATES.BODY.NEWLINE);
  processTemplateFile(EVENT_ANNOUNCEMENT_TEMPLATES.MAIL.FILE_ID, mapping, EVENT_ANNOUNCEMENT_TEMPLATES.MAIL.NEWLINE);
  processTemplateFile(EVENT_ANNOUNCEMENT_TEMPLATES.DAY_OF.FILE_ID, mapping, EVENT_ANNOUNCEMENT_TEMPLATES.DAY_OF.NEWLINE);
  processTemplateFile(EVENT_ANNOUNCEMENT_TEMPLATES.SPOT.FILE_ID, mapping, EVENT_ANNOUNCEMENT_TEMPLATES.SPOT.NEWLINE);

  // 開催告知メール.htmlの更新（CSS + BODYのマージ処理）
  generateEventAnnouncementEmail();

  // 3. 必要な値を取得してキャンペーン作成
  const campaignTitlePrefix = mapping[MAPPING_KEYS.CAMPAIGN_TITLE_PREFIX];
  const emailSubject = mapping[MAPPING_KEYS.ANNOUNCEMENT_TITLE];
  if (!campaignTitlePrefix || !emailSubject) {
    throw new Error('必要な設定値が取得できませんでした（CAMPAIGN_TITLE_PREFIX、ANNOUNCEMENT_TITLE）');
  }

  const htmlContent = getFileContent(FILE_NAMES.EVENT_ANNOUNCEMENT_TEMPLATE);
  buildEventAnnouncementCampaign(campaignTitlePrefix, emailSubject, htmlContent);
}

/**
 * 開催告知キャンペーンを構築
 * @param {string} campaignTitlePrefix - キャンペーン名プレフィックス
 * @param {string} subject - メール件名
 * @param {string} htmlContent - メール本文（HTML）
 * @throws {Error} キャンペーン作成に失敗した場合
 */
function buildEventAnnouncementCampaign(campaignTitlePrefix, subject, htmlContent) {
  const campaignName = `${campaignTitlePrefix}_開催告知`;

  try {
    const campaignId = SendGridLibrary.createCampaignWithContent(
      campaignName,
      subject,
      htmlContent,
      null, // セグメントIDは指定しない（リストIDのみ使用）
      SENDGRID_IDS.SENDER_ID,
      SENDGRID_IDS.UNSUBSCRIBE_GROUP_ID,
      SENDGRID_IDS.TEST_LIST_ID,
      null // scheduledTimeを指定せずDraftを作成
    );

    if (!campaignId) {
      throw new Error('Failed to create event announcement campaign');
    }

    Logger.log(`✓ Event announcement campaign created: ${campaignId}`);
    Logger.log(`Campaign Name: ${campaignName}`);
    Logger.log(`Subject: ${subject}`);
    Logger.log('✓ 開催告知キャンペーン作成完了');
  } catch (error) {
    Logger.log(`✗ Error creating event announcement campaign: ${error.message}`);
    throw error;
  }
}

/**
 * 開催告知メール.htmlを生成する
 * CSS + BODYのマージ処理を行う
 */
function generateEventAnnouncementEmail() {
  const EVENT_ANNOUNCEMENT_EMAIL_FILENAME = "開催告知メール.html";
  const EVENT_ANNOUNCEMENT_BODY_FILENAME = "開催告知本文.html";

  try {
    Logger.log('=== 開催告知メール.html の生成を開始 ===');

    // スプレッドシートと同階層のファイルを取得
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const folder = DriveApp.getFileById(spreadsheet.getId()).getParents().next();

    // 開催告知メール.htmlを取得
    const baseFiles = folder.getFilesByName(EVENT_ANNOUNCEMENT_EMAIL_FILENAME);
    if (!baseFiles.hasNext()) {
      throw new Error(`${EVENT_ANNOUNCEMENT_EMAIL_FILENAME}が見つかりません`);
    }
    const baseFile = baseFiles.next();
    let htmlContent = baseFile.getBlob().getDataAsString();
    Logger.log(`${EVENT_ANNOUNCEMENT_EMAIL_FILENAME}を取得しました`);

    // CSSファイルの内容を取得
    const cssFile = DriveApp.getFileById(FILE_IDS.CSS_FILE_ID);
    const cssContent = cssFile.getBlob().getDataAsString();
    Logger.log('CSSファイルの内容を取得しました');

    // 開催告知本文.htmlを取得
    const bodyFiles = folder.getFilesByName(EVENT_ANNOUNCEMENT_BODY_FILENAME);
    if (!bodyFiles.hasNext()) {
      throw new Error(`${EVENT_ANNOUNCEMENT_BODY_FILENAME}が見つかりません`);
    }
    const bodyFile = bodyFiles.next();
    const bodyContent = bodyFile.getBlob().getDataAsString();
    Logger.log(`${EVENT_ANNOUNCEMENT_BODY_FILENAME}の内容を取得しました`);

    // /* CSS */ 部分を置換
    htmlContent = htmlContent.replace(/\/\* CSS \*\//, cssContent);
    Logger.log('/* CSS */ 部分を置換しました');

    // /* BODY */ 部分を開催告知本文.htmlの内容で置換
    htmlContent = htmlContent.replace(/\/\* BODY \*\//, bodyContent);
    Logger.log('/* BODY */ 部分を開催告知本文.htmlの内容で置換しました');

    // 既存の開催告知メール.htmlファイルを更新
    baseFile.setContent(htmlContent);

    Logger.log(`✓ ${EVENT_ANNOUNCEMENT_EMAIL_FILENAME} の更新が完了しました`);

  } catch (error) {
    Logger.log(`✗ 開催告知メール.htmlの生成に失敗しました: ${error.message}`);
    throw error;
  }
}
