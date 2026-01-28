const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1415843413429063720/rnVNohSqbY2Wp4OxeSDDdPysKsV64VzeEla2MNQ50GtADzhSOrEFvHLzmZvJSjv98MmE';
const DISCORD_USER_ID = '385067164693954560';

function postDiscordNotification() {
  Logger.log('=== Posting Discord Notification ===');

  try {
    const mapping = getMappingData();

    const barrelUrl = mapping[MAPPING_KEYS.ANNOUNCEMNT_BARREL_URL];
    const announcementPageUrl = mapping[MAPPING_KEYS.ANNOUNCEMENT_PAGE_URL];
    const xUrl = mapping[MAPPING_KEYS.ANNOUNCEMNT_X_URL];

    // BARREL URLに値がある場合は処理を終了
    if (barrelUrl && barrelUrl !== MAPPING_KEYS.ANNOUNCEMNT_BARREL_URL) {
      Logger.log('✓ BARREL URLが設定済みのため、Discord通知をスキップします');
      return;
    }

    if (announcementPageUrl === MAPPING_KEYS.ANNOUNCEMENT_PAGE_URL || xUrl === MAPPING_KEYS.ANNOUNCEMNT_X_URL) {
      Logger.log('✓ 告知URLが未設定のため、Discord通知をスキップします');
      return;
    }

    if (!announcementPageUrl || !xUrl) {
      throw new Error('告知ページURLとX URLの両方が設定されている必要があります');
    }

    const message = `<@!${DISCORD_USER_ID}> 以下のBARREL連携及び、Xでのリツイートお願いします
告知ページURL: ${announcementPageUrl}
XのURL: ${xUrl}`;

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

    if (response.getResponseCode() !== 204) {
      throw new Error(`Discord notification failed with status: ${response.getResponseCode()}`);
    }

    Logger.log('✓ Discord notification posted successfully');

  } catch (error) {
    Logger.log(`✗ Error posting Discord notification: ${error.message}`);
    throw error;
  }
}

