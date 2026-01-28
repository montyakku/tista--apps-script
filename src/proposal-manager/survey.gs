// 共通定数はutils.gsで定義済み

// テンプレートファイル設定
const SURVEY_TEMPLATE = {
  FILE_ID: "12PZeHVzJ6i9bXtYzB_DjnMcvz9LwQRHi",
  NEWLINE: "<br>"
};

/**
 * アンケートキャンペーン作成を実行
 * マッピング取得→テンプレート生成→キャンペーン作成を一気通貫で実行
 */
function surveyRun() {
  Logger.log('=== Survey: アンケートキャンペーン作成開始 ===');

  // 1. マッピングデータを取得
  const mapping = getMappingData();

  // 2. テンプレート生成
  processTemplateFile(SURVEY_TEMPLATE.FILE_ID, mapping, SURVEY_TEMPLATE.NEWLINE);

  // 3. 必要な値を取得してキャンペーン作成
  const eventDate = mapping[MAPPING_KEYS.DATE];
  const subject = mapping[MAPPING_KEYS.SURVEY_MAIL_TITLE];
  const campaignTitlePrefix = mapping[MAPPING_KEYS.CAMPAIGN_TITLE_PREFIX];

  if (!eventDate || !subject || !campaignTitlePrefix) {
    throw new Error('必要な設定値が取得できませんでした（DATE、SURVEY_MAIL_TITLE、CAMPAIGN_TITLE_PREFIX）');
  }

  const emailContent = getFileContent(FILE_NAMES.SURVEY_EMAIL);
  buildSurveyCampaigns(eventDate, subject, campaignTitlePrefix, emailContent);
}

/**
 * アンケートキャンペーンを構築
 * @param {string} eventDate - イベント日付（例: "2026年1月25日"）
 * @param {string} subject - メール件名
 * @param {string} campaignTitlePrefix - キャンペーン名プレフィックス
 * @param {string} emailContent - メール本文
 * @throws {Error} キャンペーン作成に失敗した場合
 */
function buildSurveyCampaigns(eventDate, subject, campaignTitlePrefix, emailContent) {
  // テキストコンテンツの改行を<br>タグに変換
  const htmlEmailContent = emailContent.replace(/\n/g, '<br>');
  
  // イベント日付をDateオブジェクトに変換（日本時間として明示的に作成）
  const dateString = eventDate.replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/, '$1/$2/$3');
  const eventDateObj = new Date(dateString + ' 00:00:00 +09:00'); // 日本時間として明示
  
  // 各種日付形式を生成
  const eventDateYYYYMMDD = Utilities.formatDate(eventDateObj, 'Asia/Tokyo', 'yyyyMMdd'); // YYYYMMDD形式
  
  // 各キャンペーンの送信予約日時を設定
  const survey1ScheduleTime = new Date(eventDateObj);
  survey1ScheduleTime.setHours(20, 0, 0, 0); // イベント日の20:00
  
  const survey2ScheduleTime = new Date(eventDateObj);
  survey2ScheduleTime.setDate(eventDateObj.getDate() + 2);
  survey2ScheduleTime.setHours(20, 0, 0, 0); // イベントから2日後の20:00
  
  const survey3ScheduleTime = new Date(eventDateObj);
  survey3ScheduleTime.setDate(eventDateObj.getDate() + 3);
  survey3ScheduleTime.setHours(20, 0, 0, 0); // イベントから3日後の20:00
  
  Logger.log(`Survey1 scheduled: ${survey1ScheduleTime}`);
  Logger.log(`Survey2 scheduled: ${survey2ScheduleTime}`);
  Logger.log(`Survey3 scheduled: ${survey3ScheduleTime}`);
  
  try {
    // セグメント条件:
    // recent_event_attended_dates にイベント日(YYYYMMDD)が含まれる
    // AND last_survey_event_date < イベント日(YYYYMMDD)
    //
    // 注意:
    // - TEXT型でもYYYYMMDD形式なら文字列比較で日付順になる (例: "20260110" < "20260113")
    // - 空文字列も less than 判定で true になる (例: "" < "20260113")
    const segmentConditions = [
      {
        field: 'recent_event_attended_dates',
        operator: 'contains',
        value: eventDateYYYYMMDD,
        and_or: ''
      },
      {
        field: 'last_survey_event_date',
        operator: 'lt',
        value: eventDateYYYYMMDD,
        and_or: 'and'
      }
    ];

    Logger.log(`Segment conditions: recent_event_attended_dates contains ${eventDateYYYYMMDD} AND last_survey_event_date < ${eventDateYYYYMMDD}`);

    const segmentName = `${eventDateYYYYMMDD}_${SEGMENT_NAMES.SURVEY_PENDING}`;
    const segmentId = SendGridLibrary.createSegment(segmentName, segmentConditions);

    if (!segmentId) {
      throw new Error('Failed to create segment');
    }

    const campaignPrefix = settings.campaignTitlePrefix;
    
    // 1. アンケート1（初回）
    const survey1CampaignName = `${campaignPrefix}_アンケート1`;
    const survey1CampaignId = SendGridLibrary.createCampaignWithContent(
      survey1CampaignName, 
      subject, 
      htmlEmailContent, 
      segmentId, 
      SENDGRID_IDS.SENDER_ID,
      SENDGRID_IDS.UNSUBSCRIBE_GROUP_ID,
      SENDGRID_IDS.TEST_LIST_ID,
      survey1ScheduleTime
    );
    
    // 2. アンケート2（リマインド）
    const survey2CampaignName = `${campaignPrefix}_アンケート2`;
    const reminderSubject = `【リマインド】${subject}`;
    const reminderContent = REMINDER_MESSAGES.PREFIX.replace(/\n/g, '<br>') + htmlEmailContent;
    const survey2CampaignId = SendGridLibrary.createCampaignWithContent(
      survey2CampaignName, 
      reminderSubject, 
      reminderContent, 
      segmentId, 
      SENDGRID_IDS.SENDER_ID,
      SENDGRID_IDS.UNSUBSCRIBE_GROUP_ID,
      SENDGRID_IDS.TEST_LIST_ID,
      survey2ScheduleTime
    );
    
    // 3. アンケート3（最終リマインド）
    const survey3CampaignName = `${campaignPrefix}_アンケート3`;
    const finalReminderSubject = `【最終リマインド】${subject}`;
    const finalReminderContent = REMINDER_MESSAGES.PREFIX.replace(/\n/g, '<br>') + htmlEmailContent;
    const survey3CampaignId = SendGridLibrary.createCampaignWithContent(
      survey3CampaignName, 
      finalReminderSubject, 
      finalReminderContent, 
      segmentId, 
      SENDGRID_IDS.SENDER_ID,
      SENDGRID_IDS.UNSUBSCRIBE_GROUP_ID,
      SENDGRID_IDS.TEST_LIST_ID,
      survey3ScheduleTime
    );

    if (!survey1CampaignId) {
      throw new Error('Failed to create survey1 campaign');
    }
    Logger.log(`✓ Survey1 campaign draft created: ${survey1CampaignId}`);

    if (!survey2CampaignId) {
      throw new Error('Failed to create survey2 campaign');
    }
    Logger.log(`✓ Survey2 campaign draft created: ${survey2CampaignId}`);

    if (!survey3CampaignId) {
      throw new Error('Failed to create survey3 campaign');
    }
    Logger.log(`✓ Survey3 campaign draft created: ${survey3CampaignId}`);

    Logger.log(`Event Date: ${eventDate}`);
    Logger.log(`Subject: ${subject}`);
    Logger.log(`Target: Attended ${eventDate} but no survey response`);
    Logger.log('✓ アンケートキャンペーン作成完了');
  } catch (error) {
    Logger.log(`✗ Error creating campaigns: ${error.message}`);
    throw error;
  }
}

