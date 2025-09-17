/**
 * WordPress REST API ライブラリ
 */

/**
 * WordPress認証情報を取得
 * @returns {Object|null} - 認証情報（失敗時はnull）
 */
function getWordPressAuth() {
  const siteUrl = PropertiesService.getScriptProperties().getProperty('WORDPRESS_SITE_URL');
  const username = PropertiesService.getScriptProperties().getProperty('WORDPRESS_USERNAME');
  const password = PropertiesService.getScriptProperties().getProperty('WORDPRESS_APP_PASSWORD');
  
  if (!siteUrl || !username || !password) {
    return null;
  }
  
  return {
    siteUrl,
    username,
    password,
    credentials: Utilities.base64Encode(`${username}:${password}`)
  };
}

/**
 * WordPress投稿を作成
 * @param {string} title - 投稿タイトル
 * @param {string} content - 投稿内容（HTML）
 * @param {string} status - 投稿ステータス（'draft', 'publish'など）
 * @param {string} postType - 投稿タイプ（'posts', 'news'など）デフォルト: 'posts'
 * @param {number} mediaId - アイキャッチ画像のメディアID（オプション）
 * @param {string} slug - 投稿スラッグ（オプション）
 * @returns {Object|null} - 作成された投稿の情報（失敗時はnull）
 */
function createPost(title, content, status = 'draft', postType = 'posts', mediaId = null, slug = null) {
  try {
    Logger.log('=== WordPress投稿作成開始 ===');
    
    // 認証情報を取得
    const auth = getWordPressAuth();
    if (!auth) {
      throw new Error('WordPress認証情報が設定されていません（WORDPRESS_SITE_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD）');
    }
    
    // 投稿データ
    const postData = {
      title: title,
      content: content,
      status: status
    };
    
    // スラッグが指定されている場合は設定
    if (slug) {
      postData.slug = slug;
    }
    
    // アイキャッチ画像がある場合は設定
    if (mediaId) {
      postData.featured_media = mediaId;
      Logger.log(`✓ アイキャッチ画像を設定: MediaID ${mediaId}`);
    } else {
      Logger.log('メディアIDが未設定です');
    }
    
    Logger.log(`投稿データ: ${JSON.stringify(postData, null, 2)}`);
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth.credentials}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(postData),
      muteHttpExceptions: true
    };
    
    const url = `${auth.siteUrl}/wp-json/wp/v2/${postType}`;
    const response = UrlFetchApp.fetch(url, options);
    
    if (response.getResponseCode() === 201) {
      const result = JSON.parse(response.getContentText());
      Logger.log(`✓ WordPress投稿を作成しました: ${result.link}`);
      return {
        id: result.id,
        title: result.title.rendered,
        link: result.link,
        status: result.status
      };
    } else {
      Logger.log(`✗ WordPress投稿の作成に失敗: ${response.getResponseCode()}`);
      Logger.log(`Response: ${response.getContentText()}`);
      return null;
    }
    
  } catch (error) {
    Logger.log(`✗ WordPress投稿作成エラー: ${error.message}`);
    throw error;
  }
}

/**
 * WordPress認証テスト
 * @returns {boolean} - 認証が成功したかどうか
 */
function testAuth() {
  try {
    const auth = getWordPressAuth();
    if (!auth) {
      Logger.log('✗ WordPress認証情報が設定されていません');
      return false;
    }
    
    Logger.log(`Testing authentication for: ${auth.username}`);
    Logger.log(`Site URL: ${auth.siteUrl}`);
    
    // 1. REST APIが利用可能かチェック
    const apiUrl = `${auth.siteUrl}/wp-json/wp/v2`;
    const apiResponse = UrlFetchApp.fetch(apiUrl, { muteHttpExceptions: true });
    Logger.log(`API endpoint response: ${apiResponse.getResponseCode()}`);
    
    // 2. ユーザー情報を取得してみる
    const userUrl = `${auth.siteUrl}/wp-json/wp/v2/users/me`;
    const userOptions = {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth.credentials}`
      },
      muteHttpExceptions: true
    };
    
    const userResponse = UrlFetchApp.fetch(userUrl, userOptions);
    Logger.log(`User endpoint response: ${userResponse.getResponseCode()}`);
    Logger.log(`User response: ${userResponse.getContentText()}`);
    
    return userResponse.getResponseCode() === 200;
    
  } catch (error) {
    Logger.log(`✗ 認証テストエラー: ${error.message}`);
    return false;
  }
}

/**
 * 指定した投稿タイプのエンドポイントをテスト
 * @param {string} postType - 投稿タイプ（'posts', 'news'など）
 * @returns {boolean} - エンドポイントが利用可能かどうか
 */
function testPostType(postType = 'posts') {
  try {
    const auth = getWordPressAuth();
    if (!auth) {
      Logger.log('✗ WordPress認証情報が設定されていません');
      return false;
    }
    
    // 投稿タイプエンドポイントをテスト
    const testUrl = `${auth.siteUrl}/wp-json/wp/v2/${postType}?per_page=1`;
    const testOptions = {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth.credentials}`
      },
      muteHttpExceptions: true
    };
    
    const testResponse = UrlFetchApp.fetch(testUrl, testOptions);
    Logger.log(`${postType} endpoint response: ${testResponse.getResponseCode()}`);
    
    return testResponse.getResponseCode() === 200;
    
  } catch (error) {
    Logger.log(`✗ ${postType}エンドポイントテストエラー: ${error.message}`);
    return false;
  }
}
