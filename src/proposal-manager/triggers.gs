/**
 * スプレッドシートのトリガー関数とUI設定
 * - onOpen: スプレッドシート起動時のメニュー作成とファイル名更新
 * - onEdit: セル編集時のファイル名自動更新
 */

// === ファイル名自動更新の設定 ===
const TARGET_SHEET_NAME = "企画書";
const DATE_CELL_REF = "B13";
const FILENAME_PREFIX = "_企画書"; // ファイル名の後半に追加する文字列
const EXCLUDED_KEYWORD = "雛形";   // この文字列がファイル名に入っていたらスキップ

/**
 * スプレッドシート起動時に実行
 * - カスタムメニューを作成
 * - ファイル名を自動更新
 */
function onOpen() {
  // カスタムメニューの作成
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('⚡自動操作ボタン')
    .addItem('開催告知メール', 'eventAnnouncementRun')
    .addItem('開催告知ページ', 'createEventAnnouncementPost')
    .addItem('X投稿', 'xPostRun')
    .addItem('BARREL連携', 'postDiscordNotification')
    .addItem('登壇者確認メール', 'speakerConfirmationRun')
    .addItem('前日参加者向けメール', 'dayBeforeParticipationRun')
    .addItem('スポット参加メール', 'spotParticipationRun')
    .addItem('アンケート', 'surveyRun')
    .addToUi();

  // ファイル名の自動更新
  updateFilenameFromCell();
}

/**
 * セル編集時に実行
 * 日付セル（B13）が編集されたらファイル名を自動更新
 */
function onEdit(e) {
  const range = e.range;
  const sheet = e.source.getActiveSheet();
  const editedCell = range.getA1Notation();

  if (sheet.getName() === TARGET_SHEET_NAME && editedCell === DATE_CELL_REF) {
    updateFilenameFromCell();
  }
}

/**
 * ファイル名を日付セルの値から自動更新
 * 形式: YYYYMMDD_企画書
 */
function updateFilenameFromCell() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const currentName = ss.getName();

  if (currentName.includes(EXCLUDED_KEYWORD)) {
    Logger.log(`「${EXCLUDED_KEYWORD}」が含まれているためファイル名は変更されません。`);
    return;
  }

  const sheet = ss.getSheetByName(TARGET_SHEET_NAME);
  if (!sheet) {
    Logger.log(`シート「${TARGET_SHEET_NAME}」が見つかりません`);
    return;
  }

  const dateValue = sheet.getRange(DATE_CELL_REF).getValue();
  if (dateValue instanceof Date) {
    const formattedDate = Utilities.formatDate(dateValue, Session.getScriptTimeZone(), "yyyyMMdd");
    const newName = `${formattedDate}${FILENAME_PREFIX}`;
    if (currentName !== newName) {
      ss.rename(newName);
    }
  } else {
    Logger.log(`${DATE_CELL_REF} に有効な日付がありません`);
  }
}
