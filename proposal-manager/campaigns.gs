const MAPPING_KEYS = {
  DATE: '<!--#DATE#-->',
  SURVEY_MAIL_TITLE: '<!--#SURVEY_MAIL_TITLE#-->',
  CAMPAIGN_TITLE_PREFIX: '<!--#CAMPAIGN_TITLE_PREFIX#-->'
};

const FILE_NAMES = {
  SURVEY_EMAIL: '参加者アンケート.txt'
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


function getEmailContentFromFile(fileName) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const folder = DriveApp.getFileById(spreadsheet.getId()).getParents().next();
    
    const files = folder.getFilesByName(fileName);
    if (!files.hasNext()) {
      Logger.log(`✗ File "${fileName}" not found in spreadsheet directory`);
      return null;
    }
    
    const file = files.next();
    const content = file.getBlob().getDataAsString();
    Logger.log(`✓ Successfully loaded content from "${fileName}"`);
    return content;
    
  } catch (error) {
    Logger.log(`✗ Error reading file "${fileName}": ${error.message}`);
    return null;
  }
}

function getSettingsFromSpreadsheet() {
  const mapping = getMappingData();
  if (!mapping) {
    return null;
  }

  const settings = {
    eventDate: mapping[MAPPING_KEYS.DATE],
    surveyMailTitle: mapping[MAPPING_KEYS.SURVEY_MAIL_TITLE],
    campaignTitlePrefix: mapping[MAPPING_KEYS.CAMPAIGN_TITLE_PREFIX]
  };

  return settings;
}

function createSurveyCampaigns() {
  Logger.log('=== Creating Survey Campaigns (Draft) ===');
  
  const settings = getSettingsFromSpreadsheet();
  if (!settings || !settings.eventDate || !settings.surveyMailTitle || !settings.campaignTitlePrefix) {
    Logger.log('✗ 必要な設定値が取得できませんでした（DATE、SURVEY_MAIL_TITLE、CAMPAIGN_TITLE_PREFIX）');
    return null;
  }

  const emailContent = getEmailContentFromFile(FILE_NAMES.SURVEY_EMAIL);
  if (!emailContent) {
    Logger.log('✗ Failed to load email content');
    return null;
  }

  const eventDate = settings.eventDate;
  const subject = settings.surveyMailTitle;
  
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
    // 日本時間のイベント日はUTCでは前日になるため、前日をeqで指定
    const eventDateStart = new Date(eventDateObj);
    eventDateStart.setDate(eventDateObj.getDate() - 1);
    
    const startDateMMDDYYYY = Utilities.formatDate(eventDateStart, 'Asia/Tokyo', 'MM/dd/yyyy');
    
    const segmentConditions = [
      {
        field: 'last_event_attended_at',
        operator: 'eq',
        value: startDateMMDDYYYY,
        and_or: ''
      },
      {
        field: 'last_survey_event_date',
        operator: 'ne',
        value: startDateMMDDYYYY,
        and_or: 'and'
      }
    ];
    
    const segmentName = `${eventDateYYYYMMDD}_${SEGMENT_NAMES.SURVEY_PENDING}`;
    const segmentId = SendGridLibrary.createSegment(segmentName, segmentConditions);
    
    if (!segmentId) {
      Logger.log('✗ Failed to create segment');
      return null;
    }

    const campaignPrefix = settings.campaignTitlePrefix;
    
    // 1. アンケート1（初回）
    const survey1CampaignName = `${campaignPrefix}_アンケート1`;
    const survey1CampaignId = SendGridLibrary.createCampaignWithContent(
      survey1CampaignName, 
      subject, 
      emailContent, 
      segmentId, 
      SENDGRID_IDS.SENDER_ID,
      SENDGRID_IDS.UNSUBSCRIBE_GROUP_ID,
      SENDGRID_IDS.TEST_LIST_ID,
      survey1ScheduleTime
    );
    
    // 2. アンケート2（リマインド）
    const survey2CampaignName = `${campaignPrefix}_アンケート2`;
    const reminderSubject = `【リマインド】${subject}`;
    const reminderContent = REMINDER_MESSAGES.PREFIX + emailContent;
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
    const finalReminderContent = REMINDER_MESSAGES.PREFIX + emailContent;
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

    const results = [];
    
    if (survey1CampaignId) {
      Logger.log(`✓ Survey1 campaign draft created: ${survey1CampaignId}`);
      results.push({ type: 'survey1', id: survey1CampaignId, name: survey1CampaignName });
    } else {
      Logger.log('✗ Failed to create survey1 campaign');
    }

    if (survey2CampaignId) {
      Logger.log(`✓ Survey2 campaign draft created: ${survey2CampaignId}`);
      results.push({ type: 'survey2', id: survey2CampaignId, name: survey2CampaignName });
    } else {
      Logger.log('✗ Failed to create survey2 campaign');
    }

    if (survey3CampaignId) {
      Logger.log(`✓ Survey3 campaign draft created: ${survey3CampaignId}`);
      results.push({ type: 'survey3', id: survey3CampaignId, name: survey3CampaignName });
    } else {
      Logger.log('✗ Failed to create survey3 campaign');
    }

    Logger.log(`Event Date: ${eventDate}`);
    Logger.log(`Subject: ${subject}`);
    Logger.log(`Target: Attended ${eventDate} but no survey response`);

    return results;
    
  } catch (error) {
    Logger.log(`✗ Error creating campaigns: ${error.message}`);
    return null;
  }
}

