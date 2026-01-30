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
  SPEAKER_CONFIRMATION_EMAIL: '登壇者確認メール.txt',
  DAY_BEFORE_PARTICIPATION_EMAIL: '前日参加者向けメール.txt'
};

const SEGMENT_NAMES = {
  SURVEY_PENDING: 'アンケート未回答',
  DAY_BEFORE_PARTICIPATION: '参加者',
  SPEAKER: '登壇者'
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
 * @returns {string} ファイル内容
 * @throws {Error} ファイルが見つからない、または読み取りに失敗した場合
 */
function getFileContent(fileName) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const folder = DriveApp.getFileById(spreadsheet.getId()).getParents().next();

    const files = folder.getFilesByName(fileName);
    if (!files.hasNext()) {
      const error = `File "${fileName}" not found in spreadsheet directory`;
      Logger.log(`✗ ${error}`);
      throw new Error(error);
    }

    const file = files.next();
    const content = file.getBlob().getDataAsString('UTF-8');
    Logger.log(`✓ Successfully loaded file content from "${fileName}"`);
    return content;

  } catch (error) {
    const errorMsg = `Error reading file "${fileName}": ${error.message}`;
    Logger.log(`✗ ${errorMsg}`);
    throw new Error(errorMsg);
  }
}

/**
 * スプレッドシートからマッピングデータを取得
 * 同一実行内では1回だけスプレッドシートを読み込み、以降はキャッシュから取得
 * @param {boolean} forceRefresh - キャッシュを無視して強制的に再取得する場合はtrue
 * @returns {Object} - マッピングデータ (キー: 置換対象文字列, 値: 値)
 * @throws {Error} シートが見つからない場合
 */
function getMappingData(forceRefresh = false) {
  const CACHE_KEY = 'mapping_data_cache';
  const cache = CacheService.getScriptCache();

  // キャッシュから取得を試みる
  if (!forceRefresh) {
    const cachedData = cache.get(CACHE_KEY);
    if (cachedData) {
      Logger.log("✓ マッピングデータをキャッシュから取得しました");
      return JSON.parse(cachedData);
    }
  }

  // キャッシュがない場合、スプレッドシートから取得
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "自動生成用マッピング";
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    const error = `シート "${sheetName}" が見つかりません`;
    Logger.log(`✗ ${error}`);
    throw new Error(error);
  }

  const data = sheet.getDataRange().getValues();
  const mapping = {};

  data.forEach(row => {
    const key = row[0]; // A列: 置換対象文字列
    const value = String(row[1] || ""); // B列: 置き換える文字列

    // そのまま値を格納（改行処理はprocessTemplateFileで行う）
    mapping[key] = value;
  });

  Logger.log("✓ マッピングデータを正常に取得しました");

  // キャッシュに保存（600秒 = 10分間有効）
  try {
    cache.put(CACHE_KEY, JSON.stringify(mapping), 600);
  } catch (error) {
    Logger.log(`⚠ キャッシュへの保存に失敗: ${error.message}`);
  }

  return mapping;
}

/**
 * テンプレートファイルを処理して置換後のファイルを出力
 * @param {string} templateFileId - テンプレートファイルのID
 * @param {Object} mapping - マッピングデータ (キー: 置換対象文字列, 値: 値)
 * @param {string} newlineReplacement - 改行を置換する文字列（例: "<br />" または "\n"）
 * @returns {string} 生成されたファイル名
 * @throws {Error} ファイル取得や処理に失敗した場合
 */
function processTemplateFile(templateFileId, mapping, newlineReplacement) {
  try {
    // テンプレートファイルを取得
    const file = DriveApp.getFileById(templateFileId);
    const originalFileName = file.getName();
    let fileContent = file.getBlob().getDataAsString();

    // ファイル内容を置換
    for (const [key, value] of Object.entries(mapping)) {
      const regex = new RegExp(key, "g");
      if (!fileContent.includes(key)) {
        continue;
      }

      // 値に改行が含まれている場合、指定された改行置換文字列で置き換え
      let replacementValue = value;
      if (value.includes("\n")) {
        replacementValue = value.replace(/\n/g, newlineReplacement);
      }

      fileContent = fileContent.replace(regex, replacementValue);
    }

    // 出力ファイル名を生成（「雛形_」を省略）
    const outputFileName = originalFileName.startsWith("雛形_")
      ? originalFileName.replace(/^雛形_/, "")
      : originalFileName;

    // 置換後のファイルを新しいファイルとしてスプレッドシートと同じフォルダに出力
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const folder = DriveApp.getFileById(spreadsheet.getId()).getParents().next();

    // 同名ファイルが存在するか確認して削除
    const existingFiles = folder.getFilesByName(outputFileName);
    while (existingFiles.hasNext()) {
      existingFiles.next().setTrashed(true);
    }

    // ファイルの拡張子に応じてMimeTypeを設定
    const mimeType = outputFileName.endsWith('.html') ? MimeType.HTML : MimeType.PLAIN_TEXT;
    folder.createFile(outputFileName, fileContent, mimeType);

    Logger.log(`✓ "${outputFileName}" を生成しました`);
    return outputFileName;
  } catch (error) {
    const errorMsg = `テンプレートファイル (ID: ${templateFileId}) の処理に失敗: ${error.message}`;
    Logger.log(`✗ ${errorMsg}`);
    throw new Error(errorMsg);
  }
}

