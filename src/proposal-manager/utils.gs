/**
 * proposal-manager共通ユーティリティ関数集
 */

// 共通定数
const MAPPING_KEYS = {
  DATE: '<!--#DATE#-->',
  SURVEY_MAIL_TITLE: '<!--#SURVEY_MAIL_TITLE#-->',
  CAMPAIGN_TITLE_PREFIX: '<!--#CAMPAIGN_TITLE_PREFIX#-->',
  ANNOUNCEMENT_TITLE: '<!--#ANNOUNCEMENT_TITLE#-->',
  ANNOUNCEMENT_PAGE_URL: '<!--#ANNOUNCEMENT_PAGE_URL-->',
  ANNOUNCEMNT_BARREL_URL: '<!--#ANNOUNCEMNT_BARREL_URL#-->',
  ANNOUNCEMNT_X_URL: '<!--#ANNOUNCEMNT_X_URL#-->',
  CAPTION_URL: '<!--#CAPTION_URL#-->',
  POST_SLUG: '<!--#POST_SLUG#-->',
  WP_MEDIA_ID: '<!--#WP_MEDIA_ID#-->',
  SPEAKERS: '<!--#SPEAKERS#-->',
  SPEAKER_EMAILS: '<!--#SPEAKER_EMAILS#-->',
  SPEAKER_MAIL_RECIPIENT_NAME: '<!--#SPEAKER_MAIL_RECIPIENT_NAME#-->',
  SPEAKER_CONFIRM_MAIL_SUBJECT: '<!--#SPEAKER_CONFIRM_MAIL_SUBJECT#-->'
};

const FILE_NAMES = {
  SURVEY_EMAIL: '参加者アンケート.txt',
  EVENT_ANNOUNCEMENT_TEMPLATE: '開催告知メール.html',
  SPEAKER_CONFIRMATION_EMAIL: '登壇者確認メール.txt'
};

const SEGMENT_NAMES = {
  SURVEY_PENDING: 'アンケート未回答'
};

const SENDGRID_IDS = {
  TEST_LIST_ID: 23960160,  // 自社確認用contact list
  UNSUBSCRIBE_GROUP_ID: 13279,  // 配信停止グループ
  SENDER_ID: 3861584  // SendGrid管理画面で確認したSender ID
};

const REMINDER_MESSAGES = {
  PREFIX: '先日ご案内いたしましたアンケートについて、リマインドのご連絡です。\n本メールは、まだご回答の確認が取れていない方にお送りしております。\nすでにご対応済みの場合は、行き違いにつきご容赦ください。\n\n'
};

const FILE_IDS = {
  CSS_FILE_ID: "1AOtB0imtHmnOGBnhOjerfL96lIUQxZsR"  // カスタムCSS用ファイル
};

/**
 * スプレッドシートと同階層のファイルを読み取る
 * @param {string} fileName - ファイル名
 * @returns {string|null} ファイル内容（失敗時はnull）
 */
function getFileContent(fileName) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const folder = DriveApp.getFileById(spreadsheet.getId()).getParents().next();
    
    const files = folder.getFilesByName(fileName);
    if (!files.hasNext()) {
      Logger.log(`✗ File "${fileName}" not found in spreadsheet directory`);
      return null;
    }
    
    const file = files.next();
    const content = file.getBlob().getDataAsString('UTF-8');
    Logger.log(`✓ Successfully loaded file content from "${fileName}"`);
    return content;
    
  } catch (error) {
    Logger.log(`✗ Error reading file "${fileName}": ${error.message}`);
    return null;
  }
}

/**
 * スプレッドシートからマッピングデータを取得
 * @returns {Object|null} - マッピングデータ (キー: 置換対象文字列, 値: 値)
 */
function getMappingData() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "自動生成用マッピング";
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log(`シート "${sheetName}" が見つかりません。`);
    return null;
  }

  const data = sheet.getDataRange().getValues();
  const mapping = {};

  data.forEach(row => {
    const key = row[0]; // A列: 置換対象文字列
    const value = String(row[1] || ""); // B列: 置き換える文字列

    // そのまま値を格納（改行処理はprocessTemplateFileで行う）
    mapping[key] = value;
  });

  Logger.log("マッピングデータを正常に取得しました。");
  return mapping;
}

