// 共通定数はutils.gsで定義済み


function createEventAnnouncementCampaign() {
  Logger.log('=== Creating Event Announcement Campaign ===');
  
  const mapping = getMappingData();
  if (!mapping) {
    Logger.log('✗ マッピングデータの取得に失敗しました');
    return null;
  }
  
  const campaignTitlePrefix = mapping[MAPPING_KEYS.CAMPAIGN_TITLE_PREFIX];
  const emailSubject = mapping[MAPPING_KEYS.ANNOUNCEMENT_TITLE];
  if (!campaignTitlePrefix || !emailSubject) {
    Logger.log('✗ 必要な設定値が取得できませんでした（CAMPAIGN_TITLE_PREFIX、ANNOUNCEMENT_TITLE）');
    return null;
  }
  
  const htmlContent = getFileContent(FILE_NAMES.EVENT_ANNOUNCEMENT_TEMPLATE);
  if (!htmlContent) {
    Logger.log('✗ Failed to load HTML content');
    return null;
  }
  
  const campaignName = `${campaignTitlePrefix}_開催告知`;
  const subject = emailSubject;
  
  try {
    const campaignId = SendGridLibrary.createCampaignWithContent(
      campaignName,
      subject,
      htmlContent,
      SENDGRID_IDS.SALON_PAST_PARTICIPANTS_SEGMENT_ID,
      SENDGRID_IDS.SENDER_ID,
      SENDGRID_IDS.UNSUBSCRIBE_GROUP_ID,
      SENDGRID_IDS.TEST_LIST_ID,
      null // scheduledTimeを指定せずDraftを作成
    );
    
    if (campaignId) {
      Logger.log(`✓ Event announcement campaign created: ${campaignId}`);
      Logger.log(`Campaign Name: ${campaignName}`);
      Logger.log(`Subject: ${subject}`);
      return {
        id: campaignId,
        name: campaignName,
        subject: subject
      };
    } else {
      Logger.log('✗ Failed to create event announcement campaign');
      return null;
    }
    
  } catch (error) {
    Logger.log(`✗ Error creating event announcement campaign: ${error.message}`);
    return null;
  }
}
