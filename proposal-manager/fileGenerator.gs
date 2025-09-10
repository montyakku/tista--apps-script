function generateFilesFromTemplates() {
  // テンプレートファイルIDを指定
  const templateFileIds = [
    "1p7sdbnPZEWrDxzPWSDOpT63nbje8nXea", //告知
    "1naPnuFyaMQQlJj1ZhVLbmnLWhmZ114JJ", //当日メール
    "1xlqvNwUYkY5N1YIYICiE5aiyDhx5us0m", //X
    "1oQTn_hMbvxcLAlb5sV6QBZu1UsYs1Y6X", //スポット参加メール
    "12PZeHVzJ6i9bXtYzB_DjnMcvz9LwQRHi", //参加者アンケート
    "1Qud5HGHVtxq46U-l-7QKj38-cdJQJ20h", //前日登壇者連絡
  ];

  // マッピングデータを共通で取得
  const mapping = getMappingData();
  if (!mapping) {
    Logger.log("マッピングデータの取得に失敗しました。処理を終了します。");
    return;
  }

  // 各テンプレートファイルに対して処理を実行
  templateFileIds.forEach(fileId => {
    processTemplateFile(fileId, mapping); // テンプレートファイルを処理
  });
}


/**
 * テンプレートファイルを処理して置換後のHTMLを出力
 * @param {string} templateFileId - テンプレートファイルのID
 * @param {Object} mapping - マッピングデータ (キー: 置換対象文字列, 値: processedValue)
 */
function processTemplateFile(templateFileId, mapping) {
  try {
    // テンプレートファイルを取得
    const file = DriveApp.getFileById(templateFileId);
    const originalFileName = file.getName(); // 元のファイル名を取得
    let htmlContent = file.getBlob().getDataAsString(); // HTML内容を取得
    Logger.log(`テンプレートファイル (ID: ${templateFileId}) を正常に取得しました。`);

    // HTML内容を置換
    for (const [key, content] of Object.entries(mapping)) {
      const regex = new RegExp(key, "g"); // 置換対象文字列を正規表現で検索
      if (!htmlContent.includes(key)) {
        Logger.log(`置換対象 "${key}" がテンプレートに見つかりませんでした。スキップします。`);
        continue;
      }
      htmlContent = htmlContent.replace(regex, content); // 文字列を置き換え
    }

    // 出力ファイル名を生成（「雛形_」を省略）
    const outputFileName = originalFileName.startsWith("雛形_")
      ? originalFileName.replace(/^雛形_/, "") // 「雛形_」を省略
      : originalFileName;

    // 置換後のHTMLを新しいファイルとしてスプレッドシートと同じフォルダに出力
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const folder = DriveApp.getFileById(spreadsheet.getId()).getParents().next(); // スプレッドシートが存在するフォルダを取得

    // 同名ファイルが存在するか確認
    const existingFiles = folder.getFilesByName(outputFileName);
    while (existingFiles.hasNext()) {
      const existingFile = existingFiles.next();
      Logger.log(`既存のファイル "${outputFileName}" を削除します。`);
      existingFile.setTrashed(true); // 既存のファイルをゴミ箱に移動
    }

    folder.createFile(outputFileName, htmlContent, MimeType.HTML); // 新しいHTMLファイルを作成

    Logger.log(`テンプレートファイル (ID: ${templateFileId}) の置換処理が完了し、ファイル "${outputFileName}" がフォルダに出力されました。`);
  } catch (error) {
    Logger.log(`テンプレートファイル (ID: ${templateFileId}) の処理に失敗しました: ${error.message}`);
  }
}