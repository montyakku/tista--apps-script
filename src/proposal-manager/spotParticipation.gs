/**
 * スポット参加メール生成機能
 */

// テンプレートファイル設定
const SPOT_PARTICIPATION_TEMPLATE = {
  FILE_ID: "1oQTn_hMbvxcLAlb5sV6QBZu1UsYs1Y6X",
  NEWLINE: "\n"
};

/**
 * スポット参加メール用テンプレートを生成
 * マッピング取得→テンプレート生成のみ実行
 */
function spotParticipationRun() {
  Logger.log('=== SpotParticipation: スポット参加メールテンプレート生成開始 ===');

  try {
    // 1. マッピングデータを取得
    const mapping = getMappingData();

    // 2. テンプレート生成
    processTemplateFile(SPOT_PARTICIPATION_TEMPLATE.FILE_ID, mapping, SPOT_PARTICIPATION_TEMPLATE.NEWLINE);

    Logger.log('✓ スポット参加メール.txt テンプレート生成完了');

  } catch (error) {
    Logger.log(`✗ スポット参加メールテンプレート生成エラー: ${error.message}`);
    throw error;
  }
}
