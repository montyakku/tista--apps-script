/**
 * proposal-manager用 X投稿機能
 * 実際のX API呼び出しは lib/x.gs に委譲
 */

const X_POST_FILENAME = 'X投稿.txt';

// テンプレートファイル設定
const X_POST_TEMPLATE = {
  FILE_ID: "1xlqvNwUYkY5N1YIYICiE5aiyDhx5us0m",
  NEWLINE: "\n"
};

/**
 * X投稿用テンプレートを生成
 * マッピング取得→テンプレート生成のみ実行（投稿は行わない）
 */
function xPostRun() {
  Logger.log('=== XPost: X投稿テンプレート生成開始 ===');

  try {
    // 1. マッピングデータを取得
    const mapping = getMappingData();

    // 2. テンプレート生成
    processTemplateFile(X_POST_TEMPLATE.FILE_ID, mapping, X_POST_TEMPLATE.NEWLINE);

    // 3. 投稿は後で実装するためコメントアウト
    // const postContent = getFileContent(X_POST_FILENAME);
    // const scheduledTime = calculateScheduledTime();
    // const result = postTweet(postContent, scheduledTime);
    // if (!result) {
    //   throw new Error('予約投稿に失敗しました');
    // }
    // Logger.log('✓ Xへの予約投稿が完了しました');
    // Logger.log(`予約日時: ${result.scheduled_at}`);
    // Logger.log(`Tweet URL: ${result.url}`);

    Logger.log('✓ X投稿.txt テンプレート生成完了');

  } catch (error) {
    Logger.log(`✗ X投稿テンプレート生成エラー: ${error.message}`);
    throw error;
  }
}

// 後方互換性のため残す
function postToX() {
  return xPostRun();
}

// 後方互換性のため残す（xPostRunに統合）
function schedulePostToX() {
  return xPostRun();
}
