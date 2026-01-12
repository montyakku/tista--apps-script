/**
 * WordPressにお知らせページを投稿するスクリプト
 * sendgrid-lib/wordpress.gs のライブラリを使用
 */


/**
 * 開催告知用のWordPress投稿を作成（カスタムCSSとコンテンツを組み合わせ）
 */
function createEventAnnouncementPost() {
  try {
    // マッピングデータを取得
    const mapping = getMappingData();
    if (!mapping) {
      Logger.log('✗ マッピングデータの取得に失敗しました');
      return null;
    }
    
    // 投稿タイトルを生成
    const title = mapping[MAPPING_KEYS.ANNOUNCEMENT_TITLE];

    if (!title) {
      throw new Error('開催告知タイトル（ANNOUNCEMENT_TITLE）が設定されていません。スプレッドシートを確認してください。');
    }
    
    // 投稿内容を取得
    const content = getFileContent('開催告知本文.html');
    
    if (!content) {
      throw new Error('開催告知本文.htmlが見つかりません。ファイルを確認してください。');
    }
    
    // メディアIDを取得
    const mediaIdStr = mapping[MAPPING_KEYS.WP_MEDIA_ID];
    Logger.log(`メディアID文字列: "${mediaIdStr}"`);
    const mediaId = mediaIdStr ? parseInt(mediaIdStr, 10) : null;
    Logger.log(`変換後メディアID: ${mediaId} (type: ${typeof mediaId})`);
    
    // 投稿スラッグを取得
    const slug = mapping[MAPPING_KEYS.POST_SLUG];
    
    if (slug) {
      Logger.log(`投稿スラッグ: ${slug}`);
    }
    
    // WordPress投稿を作成
    const result = SendGridLibrary.createPost(title, content, 'draft', 'news', mediaId, slug);
    
    if (result) {
      Logger.log(`✓ イベント告知投稿を作成しました: ${result.link}`);
      
      // 作成されたURLをマッピングデータに反映する場合
      // updateMappingData(MAPPING_KEYS.ANNOUNCEMENT_PAGE_URL, result.link);
      
      return result;
    }
    
    return null;
    
  } catch (error) {
    Logger.log(`✗ イベント告知投稿の作成に失敗: ${error.message}`);
    return null;
  }
}




/**
 * WordPress認証テスト用関数（ライブラリ使用）
 */
function testWordPressAuth() {
  return SendGridLibrary.testAuth();
}

/**
 * newsエンドポイントテスト
 */
function testNewsEndpoint() {
  return SendGridLibrary.testPostType('news');
}
