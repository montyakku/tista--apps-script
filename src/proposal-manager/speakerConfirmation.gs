// 共通定数はutils.gsで定義済み

/**
 * 登壇者確認メールキャンペーンをSendGridで予約作成する
 * - 実行日の10時、10時過ぎなら20時、20時過ぎなら翌日10時に1回目を予約
 * - イベント前日の10時に【前日リマインド】付きで2回目を予約
 *
 * 注意: 事前にfileGeneratorを実行して、テンプレートの置換を完了しておく必要があります
 */
function createSpeakerConfirmationCampaigns() {
  Logger.log('=== 登壇者確認メールキャンペーン作成処理開始 ===');

  try {
    // マッピングデータから必要な情報を取得
    const mapping = getMappingData();
    if (!mapping) {
      Logger.log('✗ マッピングデータの取得に失敗しました');
      return null;
    }

    const campaignTitlePrefix = mapping[MAPPING_KEYS.CAMPAIGN_TITLE_PREFIX];
    const eventDate = mapping[MAPPING_KEYS.DATE];
    const subject = mapping[MAPPING_KEYS.SPEAKER_CONFIRM_MAIL_SUBJECT];
    const speakerEmailsStr = mapping[MAPPING_KEYS.SPEAKER_EMAILS];

    if (!campaignTitlePrefix) {
      Logger.log('✗ キャンペーン名プレフィックスが取得できませんでした（CAMPAIGN_TITLE_PREFIX）');
      return null;
    }

    if (!eventDate) {
      Logger.log('✗ イベント日付が取得できませんでした（DATE）');
      return null;
    }

    if (!subject) {
      Logger.log('✗ メール件名が取得できませんでした（SPEAKER_CONFIRM_MAIL_SUBJECT）');
      return null;
    }

    // speakerEmailsStrが空でもTEST_LIST_IDを使用してキャンペーンを作成
    if (!speakerEmailsStr) {
      Logger.log('⚠ 登壇者メールアドレスが空です。TEST_LIST_IDを使用してキャンペーンを作成します。');
    }

    // fileGeneratorで生成済みのメールテンプレートを取得
    const htmlContent = getFileContent(FILE_NAMES.SPEAKER_CONFIRMATION_EMAIL);
    if (!htmlContent) {
      Logger.log('✗ メールテンプレートの読み込みに失敗しました');
      return null;
    }

    // 送信予約日時を計算
    const firstScheduledTime = calculateSpeakerConfirmationScheduledTime();
    const dayBeforeScheduledTime = calculateDayBeforeReminderTime(eventDate);

    Logger.log(`1回目送信予定: ${firstScheduledTime}`);
    Logger.log(`前日リマインド送信予定: ${dayBeforeScheduledTime}`);

    // キャンペーン用のリストIDを取得
    // 登壇者メールアドレスが空の場合もTEST_LIST_IDを使用
    const listId = createOrUpdateSpeakerContactList(speakerEmailsStr);

    const results = [];

    // 1回目のキャンペーン作成
    const firstCampaignName = `${campaignTitlePrefix}_登壇者確認メール`;
    const firstCampaignId = SendGridLibrary.createCampaignWithContent(
      firstCampaignName,
      subject,
      htmlContent,
      null, // セグメントIDは指定しない
      SENDGRID_IDS.SENDER_ID,
      SENDGRID_IDS.UNSUBSCRIBE_GROUP_ID,
      listId,
      firstScheduledTime
    );

    if (firstCampaignId) {
      Logger.log(`✓ 1回目のキャンペーンを作成しました: ${firstCampaignId}`);
      results.push({
        type: 'first',
        id: firstCampaignId,
        name: firstCampaignName,
        scheduledAt: firstScheduledTime
      });
    } else {
      Logger.log('✗ 1回目のキャンペーン作成に失敗しました');
    }

    // 前日リマインドのキャンペーン作成
    const reminderCampaignName = `${campaignTitlePrefix}_登壇者確認メール_前日リマインド`;
    const reminderSubject = `【前日リマインド】${subject}`;
    const reminderCampaignId = SendGridLibrary.createCampaignWithContent(
      reminderCampaignName,
      reminderSubject,
      htmlContent,
      null, // セグメントIDは指定しない
      SENDGRID_IDS.SENDER_ID,
      SENDGRID_IDS.UNSUBSCRIBE_GROUP_ID,
      listId,
      dayBeforeScheduledTime
    );

    if (reminderCampaignId) {
      Logger.log(`✓ 前日リマインドキャンペーンを作成しました: ${reminderCampaignId}`);
      results.push({
        type: 'dayBeforeReminder',
        id: reminderCampaignId,
        name: reminderCampaignName,
        scheduledAt: dayBeforeScheduledTime
      });
    } else {
      Logger.log('✗ 前日リマインドキャンペーン作成に失敗しました');
    }

    Logger.log('=== キャンペーン作成結果サマリー ===');
    Logger.log(`作成数: ${results.length}/2`);
    Logger.log(`イベント日: ${eventDate}`);
    Logger.log(`件名: ${subject}`);

    return results;

  } catch (error) {
    Logger.log(`✗ 登壇者確認メールキャンペーン作成処理エラー: ${error.message}`);
    return null;
  }
}

/**
 * 登壇者確認メールの送信予約時刻を計算
 * 実行時刻が10時前なら今日の10時、10時以降20時前なら今日の20時、20時以降なら翌日の10時
 * @returns {Date} 送信予約時刻
 */
function calculateSpeakerConfirmationScheduledTime() {
  const now = new Date();
  const todayAt10 = new Date(now);
  todayAt10.setHours(10, 0, 0, 0);

  const todayAt20 = new Date(now);
  todayAt20.setHours(20, 0, 0, 0);

  let scheduledTime;

  if (now < todayAt10) {
    // 10時前なら今日の10時
    scheduledTime = todayAt10;
    Logger.log(`今日の10:00に予約: ${scheduledTime}`);
  } else if (now < todayAt20) {
    // 10時以降20時前なら今日の20時
    scheduledTime = todayAt20;
    Logger.log(`今日の20:00に予約: ${scheduledTime}`);
  } else {
    // 20時以降なら翌日の10時
    const tomorrowAt10 = new Date(now);
    tomorrowAt10.setDate(tomorrowAt10.getDate() + 1);
    tomorrowAt10.setHours(10, 0, 0, 0);
    scheduledTime = tomorrowAt10;
    Logger.log(`翌日の10:00に予約: ${scheduledTime}`);
  }

  return scheduledTime;
}

/**
 * イベント前日10時の送信予約時刻を計算
 * @param {string} eventDateStr - イベント日付文字列（例: "2026年1月25日"）
 * @returns {Date} 前日10時の送信予約時刻
 */
function calculateDayBeforeReminderTime(eventDateStr) {
  // イベント日付をDateオブジェクトに変換（日本時間として明示的に作成）
  const dateString = eventDateStr.replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/, '$1/$2/$3');
  const eventDateObj = new Date(dateString + ' 00:00:00 +09:00'); // 日本時間として明示

  // 前日の10時に設定
  const dayBeforeAt10 = new Date(eventDateObj);
  dayBeforeAt10.setDate(eventDateObj.getDate() - 1);
  dayBeforeAt10.setHours(10, 0, 0, 0);

  Logger.log(`イベント前日10:00に予約: ${dayBeforeAt10}`);
  return dayBeforeAt10;
}

/**
 * 登壇者用のコンタクトリストIDを取得
 * @param {string} speakerEmailsStr - カンマ区切りのメールアドレス文字列（空文字列も可）
 * @returns {number} リストID（常にTEST_LIST_IDを返す）
 */
function createOrUpdateSpeakerContactList(speakerEmailsStr) {
  if (!speakerEmailsStr || speakerEmailsStr.trim() === '') {
    Logger.log('⚠ 登壇者メールアドレスが空です。TEST_LIST_IDを使用します。');
    return SENDGRID_IDS.TEST_LIST_ID;
  }

  // カンマ区切りで配列に変換し、空のメールアドレスを除外
  const speakerEmails = speakerEmailsStr
    .split(',')
    .map(e => e.trim())
    .filter(e => e !== '');

  if (speakerEmails.length === 0) {
    Logger.log('⚠ 有効な登壇者メールアドレスが見つかりませんでした。TEST_LIST_IDを使用します。');
    return SENDGRID_IDS.TEST_LIST_ID;
  }

  Logger.log(`✓ 送信対象: ${speakerEmails.length}件のメールアドレス`);
  speakerEmails.forEach(email => {
    Logger.log(`  - ${email}`);
  });

  // 既存のTEST_LIST_IDを使用（実際の運用では登壇者専用リストを作成することを推奨）
  // TODO: 本番運用時は登壇者専用のリストIDを作成して使用してください
  return SENDGRID_IDS.TEST_LIST_ID;
}
