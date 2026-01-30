/**
 * 前日参加者向けメール（当日メール）機能
 */

// テンプレートファイル設定
const DAY_BEFORE_PARTICIPATION_TEMPLATE = {
  FILE_ID: "1naPnuFyaMQQlJj1ZhVLbmnLWhmZ114JJ",
  NEWLINE: "\n"
};

/**
 * 前日参加者向けメールキャンペーンを実行
 * マッピング取得→テンプレート生成→キャンペーン作成を一気通貫で実行
 */
function dayBeforeParticipationRun() {
  Logger.log('=== DayBeforeParticipation: 前日参加者向けメールキャンペーン作成開始 ===');

  try {
    // 1. マッピングデータを取得
    const mapping = getMappingData();

    // 2. テンプレート生成
    processTemplateFile(DAY_BEFORE_PARTICIPATION_TEMPLATE.FILE_ID, mapping, DAY_BEFORE_PARTICIPATION_TEMPLATE.NEWLINE);

    // 3. 必要な値を取得してキャンペーン作成
    const campaignTitlePrefix = mapping[MAPPING_KEYS.CAMPAIGN_TITLE_PREFIX];
    const eventDate = mapping[MAPPING_KEYS.DATE];

    if (!campaignTitlePrefix || !eventDate) {
      throw new Error('必要な設定値が取得できませんでした（CAMPAIGN_TITLE_PREFIX、DATE）');
    }

    const emailContent = getFileContent(FILE_NAMES.DAY_BEFORE_PARTICIPATION_EMAIL);
    buildDayBeforeParticipationCampaign(campaignTitlePrefix, eventDate, emailContent);

  } catch (error) {
    Logger.log(`✗ 前日参加者向けメールキャンペーン作成処理エラー: ${error.message}`);
    throw error;
  }
}

/**
 * 前日参加者向けメールキャンペーンを構築
 * @param {string} campaignTitlePrefix - キャンペーン名プレフィックス
 * @param {string} eventDate - イベント日付（例: "2026年1月25日"）
 * @param {string} emailContent - メール本文
 * @throws {Error} キャンペーン作成に失敗した場合
 */
function buildDayBeforeParticipationCampaign(campaignTitlePrefix, eventDate, emailContent) {
  Logger.log('=== 前日参加者向けメールキャンペーン構築開始 ===');

  try {

    // イベント日付をDateオブジェクトに変換（日本時間として明示的に作成）
    const dateString = eventDate.replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/, '$1/$2/$3');
    const eventDateObj = new Date(dateString + ' 00:00:00 +09:00');

    // 各種日付形式を生成
    const eventDateYYYYMMDD = Utilities.formatDate(eventDateObj, 'Asia/Tokyo', 'yyyyMMdd'); // YYYYMMDD形式

    // 前日の20:00に送信予約
    const scheduledTime = new Date(eventDateObj);
    scheduledTime.setDate(eventDateObj.getDate() - 1); // 前日
    scheduledTime.setHours(20, 0, 0, 0); // 20:00

    Logger.log(`送信予定日時: ${scheduledTime}`);

    // セグメント条件:
    // recent_event_attended_dates にイベント日(YYYYMMDD)が含まれる
    const segmentConditions = [
      {
        field: 'recent_event_attended_dates',
        operator: 'contains',
        value: eventDateYYYYMMDD,
        and_or: ''
      }
    ];

    Logger.log(`Segment conditions: recent_event_attended_dates contains ${eventDateYYYYMMDD}`);

    const segmentName = `${eventDateYYYYMMDD}_${SEGMENT_NAMES.DAY_BEFORE_PARTICIPATION}`;
    const segmentId = SendGridLibrary.createSegment(segmentName, segmentConditions);

    if (!segmentId) {
      throw new Error('セグメントの作成に失敗しました');
    }

    Logger.log(`✓ セグメントを作成しました: ${segmentName} (ID: ${segmentId})`);

    // メール件名を生成
    const subject = `【明日開催】${eventDate}のイベントについて`;

    // キャンペーン名を生成
    const campaignName = `${campaignTitlePrefix}_前日参加者向けメール`;

    // キャンペーンを作成
    const campaignId = SendGridLibrary.createCampaignWithContent(
      campaignName,
      subject,
      emailContent,
      segmentId,
      SENDGRID_IDS.SENDER_ID,
      SENDGRID_IDS.UNSUBSCRIBE_GROUP_ID,
      SENDGRID_IDS.TEST_LIST_ID,
      scheduledTime
    );

    if (!campaignId) {
      throw new Error('前日参加者向けメールキャンペーンの作成に失敗しました');
    }

    Logger.log(`✓ 前日参加者向けメールキャンペーンを作成しました: ${campaignId}`);
    Logger.log(`キャンペーン名: ${campaignName}`);
    Logger.log(`件名: ${subject}`);
    Logger.log(`イベント日: ${eventDate}`);
    Logger.log(`対象セグメント: ${segmentName}`);
    Logger.log('✓ 前日参加者向けメールキャンペーン作成完了');

  } catch (error) {
    Logger.log(`✗ 前日参加者向けメールキャンペーン構築エラー: ${error.message}`);
    throw error;
  }
}
