// 共通定数はutils.gsで定義済み

// テンプレートファイル設定
const SPEAKER_CONFIRMATION_TEMPLATE = {
  FILE_ID: "1Qud5HGHVtxq46U-l-7QKj38-cdJQJ20h",
  NEWLINE: "<br>"
};

/**
 * 登壇者確認メールキャンペーンを実行
 * マッピング取得→テンプレート生成→キャンペーン作成を一気通貫で実行
 */
function speakerConfirmationRun() {
  Logger.log('=== SpeakerConfirmation: 登壇者確認メールキャンペーン作成開始 ===');

  try {
    // 1. マッピングデータを取得
    const mapping = getMappingData();

    // 2. テンプレート生成
    processTemplateFile(SPEAKER_CONFIRMATION_TEMPLATE.FILE_ID, mapping, SPEAKER_CONFIRMATION_TEMPLATE.NEWLINE);

    // 3. 必要な値を取得してキャンペーン作成
    const campaignTitlePrefix = mapping[MAPPING_KEYS.CAMPAIGN_TITLE_PREFIX];
    const eventDate = mapping[MAPPING_KEYS.DATE];
    const subject = mapping[MAPPING_KEYS.SPEAKER_CONFIRM_MAIL_SUBJECT];
    const speakerEmailsStr = mapping[MAPPING_KEYS.SPEAKER_EMAILS];
    const speakerNamesStr = mapping[MAPPING_KEYS.SPEAKERS];

    if (!campaignTitlePrefix || !eventDate || !subject) {
      throw new Error('必要な設定値が取得できませんでした（CAMPAIGN_TITLE_PREFIX、DATE、SPEAKER_CONFIRM_MAIL_SUBJECT）');
    }

    const htmlContent = getFileContent(FILE_NAMES.SPEAKER_CONFIRMATION_EMAIL);
    buildSpeakerConfirmationCampaigns(campaignTitlePrefix, eventDate, subject, speakerEmailsStr, speakerNamesStr, htmlContent);
  } catch (error) {
    Logger.log(`✗ 登壇者確認メールキャンペーン作成処理エラー: ${error.message}`);
    throw error;
  }
}

/**
 * 登壇者確認メールキャンペーンを構築
 * @param {string} campaignTitlePrefix - キャンペーン名プレフィックス
 * @param {string} eventDate - イベント日付（例: "2026年1月25日"）
 * @param {string} subject - メール件名
 * @param {string} speakerEmailsStr - 登壇者メールアドレス（カンマ区切り、空可）
 * @param {string} speakerNamesStr - 登壇者名（カンマ区切り、空可）
 * @param {string} htmlContent - メール本文
 * @throws {Error} キャンペーン作成に失敗した場合
 */
function buildSpeakerConfirmationCampaigns(campaignTitlePrefix, eventDate, subject, speakerEmailsStr, speakerNamesStr, htmlContent) {
  // 登壇者メールアドレスが空でもTEST_LIST_IDを使用してキャンペーンを作成
  if (!speakerEmailsStr) {
    Logger.log('⚠ 登壇者メールアドレスが空です。TEST_LIST_IDを使用してキャンペーンを作成します。');
  }

  // イベント日付をDateオブジェクトに変換（日本時間として明示的に作成）
  const dateString = eventDate.replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/, '$1/$2/$3');
  const eventDateObj = new Date(dateString + ' 00:00:00 +09:00');
  const eventDateYYYYMMDD = Utilities.formatDate(eventDateObj, 'Asia/Tokyo', 'yyyyMMdd');

  // 送信予約日時を計算
  const firstScheduledTime = calculateSpeakerConfirmationScheduledTime();
  const dayBeforeScheduledTime = calculateDayBeforeReminderTime(eventDate);

  Logger.log(`1回目送信予定: ${firstScheduledTime}`);
  Logger.log(`前日リマインド送信予定: ${dayBeforeScheduledTime}`);

  // 登壇者のContactを登録/更新し、セグメントを作成
  const segmentId = createOrUpdateSpeakerSegment(speakerEmailsStr, speakerNamesStr, eventDateYYYYMMDD);

  // 1回目のキャンペーン作成
  const firstCampaignName = `${campaignTitlePrefix}_登壇者確認メール`;
  const firstCampaignId = SendGridLibrary.createCampaignWithContent(
    firstCampaignName,
    subject,
    htmlContent,
    segmentId,
    SENDGRID_IDS.SENDER_ID,
    SENDGRID_IDS.UNSUBSCRIBE_GROUP_ID,
    SENDGRID_IDS.TEST_LIST_ID,
    firstScheduledTime
  );

  if (!firstCampaignId) {
    throw new Error('1回目のキャンペーン作成に失敗しました');
  }
  Logger.log(`✓ 1回目のキャンペーンを作成しました: ${firstCampaignId}`);

  // 前日リマインドのキャンペーン作成
  const reminderCampaignName = `${campaignTitlePrefix}_登壇者確認メール_前日リマインド`;
  const reminderSubject = `【前日リマインド】${subject}`;
  const reminderCampaignId = SendGridLibrary.createCampaignWithContent(
    reminderCampaignName,
    reminderSubject,
    htmlContent,
    segmentId,
    SENDGRID_IDS.SENDER_ID,
    SENDGRID_IDS.UNSUBSCRIBE_GROUP_ID,
    SENDGRID_IDS.TEST_LIST_ID,
    dayBeforeScheduledTime
  );

  if (!reminderCampaignId) {
    throw new Error('前日リマインドキャンペーン作成に失敗しました');
  }
  Logger.log(`✓ 前日リマインドキャンペーンを作成しました: ${reminderCampaignId}`);

  Logger.log('=== キャンペーン作成結果サマリー ===');
  Logger.log(`イベント日: ${eventDate}`);
  Logger.log(`件名: ${subject}`);
  Logger.log(`対象セグメント: ${eventDateYYYYMMDD}_${SEGMENT_NAMES.SPEAKER}`);
  Logger.log('✓ 登壇者確認メールキャンペーン作成完了');
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
 * 登壇者のContactを登録し、セグメントを作成
 * @param {string} speakerEmailsStr - カンマ区切りのメールアドレス文字列（空文字列も可）
 * @param {string} speakerNamesStr - カンマ区切りの登壇者名文字列（空文字列も可）
 * @param {string} eventDateYYYYMMDD - イベント日付（YYYYMMDD形式）
 * @returns {string|null} セグメントID（登壇者が空の場合はnull）
 */
function createOrUpdateSpeakerSegment(speakerEmailsStr, speakerNamesStr, eventDateYYYYMMDD) {
  if (!speakerEmailsStr || speakerEmailsStr.trim() === '') {
    Logger.log('⚠ 登壇者メールアドレスが空です。セグメントは作成しません。');
    return null;
  }

  // カンマ区切りで配列に変換
  const emailsRaw = speakerEmailsStr.split(',').map(e => e.trim());
  const namesRaw = speakerNamesStr
    ? speakerNamesStr.split(',').map(n => n.trim())
    : [];

  // メールアドレスと名前をペアリングし、メールアドレスが空のものを除外
  const speakers = emailsRaw
    .map((email, index) => ({
      email: email,
      name: namesRaw[index] || ''
    }))
    .filter(speaker => speaker.email !== '');

  if (speakers.length === 0) {
    Logger.log('⚠ 有効な登壇者メールアドレスが見つかりませんでした。セグメントは作成しません。');
    return null;
  }

  Logger.log(`✓ 登壇者: ${speakers.length}名`);

  // 各登壇者のContactを登録（存在しなければ）
  speakers.forEach(speaker => {
    registerSpeakerContactIfNotExists(speaker.email, speaker.name);
  });

  // 有効なメールアドレスのみ抽出
  const speakerEmails = speakers.map(s => s.email);

  // セグメント条件: email が各登壇者のメールアドレスと一致
  // 複数の登壇者がいる場合は OR で繋げる
  const segmentConditions = speakerEmails.map((email, index) => ({
    field: 'email',
    operator: 'eq',
    value: email,
    and_or: index === 0 ? '' : 'or'
  }));

  Logger.log(`Segment conditions: ${speakerEmails.map(e => `email = ${e}`).join(' OR ')}`);

  const segmentName = `${eventDateYYYYMMDD}_${SEGMENT_NAMES.SPEAKER}`;
  const segmentId = SendGridLibrary.createSegment(segmentName, segmentConditions);

  if (!segmentId) {
    throw new Error('登壇者セグメントの作成に失敗しました');
  }

  Logger.log(`✓ セグメントを作成しました: ${segmentName} (ID: ${segmentId})`);
  return segmentId;
}

/**
 * 登壇者のContactを登録（存在しなければ）
 * @param {string} email - メールアドレス
 * @param {string} name - 登壇者名
 */
function registerSpeakerContactIfNotExists(email, name) {
  try {
    // 既存のContactを検索
    const existingContactId = SendGridLibrary.findContactByEmail(email);

    if (existingContactId) {
      Logger.log(`  既存のContact: ${email}（スキップ）`);
    } else {
      // 新規Contactを作成
      Logger.log(`  新規Contact作成: ${email}`);
      const fields = {};
      if (name) {
        fields.first_name = name;
      }
      SendGridLibrary.createContact(email, fields);
      Logger.log(`    ✓ 作成完了`);
    }
  } catch (error) {
    Logger.log(`  ⚠ Contactの登録に失敗: ${email} - ${error.message}`);
    // エラーが発生しても処理を継続
  }
}
