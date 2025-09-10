/**
 * 共通ユーティリティ関数集
 */

/**
 * 日本時間のYYYY/MM/DD hh:mm:ss形式の日時文字列をUnixタイムスタンプ（秒）に変換
 * @param {string} datetimeInput - 日時文字列（YYYY/MM/DD hh:mm:ss形式）
 * @returns {number} Unixタイムスタンプ（秒）
 * @throws {Error} 無効な日時の場合
 */
function convertJstDateToTimestamp(datetimeInput) {
  if (!datetimeInput) {
    throw new Error('日時が指定されていません');
  }
  
  const datetimeString = datetimeInput.toString();
  
  // 日本時間として明示的に作成
  const jstDateString = `${datetimeString} +09:00`;
  const dateObj = new Date(jstDateString);
  
  if (isNaN(dateObj.getTime())) {
    throw new Error(`無効な日時です: ${datetimeInput}`);
  }
  
  return Math.floor(dateObj.getTime() / 1000);
}

/**
 * 日本時間のYYYY/MM/DD形式の日付文字列をUnixタイムスタンプ（秒）に変換（00:00:00で固定）
 * @param {string} dateInput - 日付文字列（YYYY/MM/DD形式）
 * @returns {number} Unixタイムスタンプ（秒）
 */
function convertJstDateToMidnightTimestamp(dateInput) {
  if (!dateInput) {
    throw new Error('日付が指定されていません');
  }
  
  const dateString = dateInput.toString();
  
  // 00:00:00を付加して日時文字列として変換
  return convertJstDateToTimestamp(`${dateString} 00:00:00`);
}

/**
 * Unixタイムスタンプ（秒）を日本時間のYYYY/MM/DD形式文字列に変換
 * @param {number} timestamp - Unixタイムスタンプ（秒）
 * @returns {string} YYYY/MM/DD形式の日付文字列
 */
function convertTimestampToJstDateString(timestamp) {
  const date = new Date(timestamp * 1000);
  return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd');
}

/**
 * 現在の日本時間をYYYY/MM/DD形式で取得
 * @returns {string} YYYY/MM/DD形式の日付文字列
 */
function getCurrentJstDateString() {
  const now = new Date();
  return Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd');
}

/**
 * 現在の日本時間の00:00:00のUnixタイムスタンプを取得
 * @returns {number} Unixタイムスタンプ（秒）
 */
function getCurrentJstMidnightTimestamp() {
  return convertJstDateToMidnightTimestamp(getCurrentJstDateString());
}