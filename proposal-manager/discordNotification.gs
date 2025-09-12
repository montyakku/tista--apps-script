const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1415843413429063720/rnVNohSqbY2Wp4OxeSDDdPysKsV64VzeEla2MNQ50GtADzhSOrEFvHLzmZvJSjv98MmE';
const DISCORD_USER_ID = '385067164693954560';

function postDiscordNotification() {
  Logger.log('=== Posting Discord Notification ===');
  
  const mapping = getMappingData();
  if (!mapping) {
    Logger.log('✗ マッピングデータの取得に失敗しました');
    throw new Error('マッピングデータの取得に失敗しました');
  }
  
  const barrelUrl = mapping[MAPPING_KEYS.ANNOUNCEMNT_BARREL_URL];
  const announcementPageUrl = mapping[MAPPING_KEYS.ANNOUNCEMENT_PAGE_URL];
  const xUrl = mapping[MAPPING_KEYS.ANNOUNCEMNT_X_URL];
  
  // BARREL URLに値がある場合は処理を終了
  if (barrelUrl && barrelUrl !== MAPPING_KEYS.ANNOUNCEMNT_BARREL_URL) {
    Logger.log('✓ BARREL URLが設定済みのため、Discord通知をスキップします');
    return false;
  }
  
  if (announcementPageUrl === MAPPING_KEYS.ANNOUNCEMENT_PAGE_URL || xUrl === MAPPING_KEYS.ANNOUNCEMNT_X_URL) {
    Logger.log('✓ 告知URLが未設定のため、Discord通知をスキップします');
    return false;
  }
  
  if (!announcementPageUrl || !xUrl) {
    throw new Error('告知ページURLとX URLの両方が設定されている必要があります');
  }
  
  const message = `<@!${DISCORD_USER_ID}> 以下のBARREL連携及び、Xでのリツイートお願いします
告知ページURL: ${announcementPageUrl}
XのURL: ${xUrl}`;
  
  try {
    
    const payload = {
      content: message,
      allowed_mentions: {
        parse: ["users"]
      }
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };
    
    const response = UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, options);
    
    if (response.getResponseCode() === 204) {
      Logger.log('✓ Discord notification posted successfully');
      return true;
    } else {
      Logger.log(`✗ Failed to post Discord notification: ${response.getResponseCode()}`);
      return false;
    }
    
  } catch (error) {
    Logger.log(`✗ Error posting Discord notification: ${error.message}`);
    throw error;
  }
}

