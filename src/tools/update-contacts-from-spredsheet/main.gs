function updateContactsFromSpreadsheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('シート2');
  
  if (!sheet) {
    Logger.log('エラー: "シート2" が見つかりません');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const dataRows = data.slice(1);
  
  Logger.log(`処理対象: ${dataRows.length} 件のレコード`);
  
  let successCount = 0;
  let errorCount = 0;
  
  const BATCH_SIZE = 100;
  const totalBatches = Math.ceil(dataRows.length / BATCH_SIZE);
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIndex = batchIndex * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, dataRows.length);
    const batch = dataRows.slice(startIndex, endIndex);
    
    Logger.log(`=== バッチ ${batchIndex + 1}/${totalBatches} 処理中 (${startIndex + 1}-${endIndex}行目) ===`);
    
    batch.forEach((row, index) => {
      const actualRowIndex = startIndex + index;
      try {
        const email = row[0];
        const name = row[1]; 
        const lastEventAttendedAtStr = row[2];
        
        if (!email || !lastEventAttendedAtStr) {
          Logger.log(`Row ${actualRowIndex + 2}: メールアドレスまたは日付が空のため、スキップ`);
          return;
        }
        
        const lastEventAttendedAt = Math.floor(lastEventAttendedAtStr.getTime() / 1000);
        const fields = { last_event_attended_at: lastEventAttendedAt };
        const createOnlyFields = name ? { first_name: name } : {};
        const success = SendGridLibrary.updateContact(email, fields, createOnlyFields);
        
        if (success) {
          successCount++;
          Logger.log(`更新成功 (Row ${actualRowIndex + 2}): ${email} -> ${lastEventAttendedAtStr}`);
        } else {
          errorCount++;
          Logger.log(`更新失敗 (Row ${actualRowIndex + 2}): ${email}`);
        }
        
      } catch (error) {
        errorCount++;
        Logger.log(`エラー (Row ${actualRowIndex + 2}): ${error.message}`);
      }
    });
    
    // バッチ間で少し待機してAPIレート制限を回避
    if (batchIndex < totalBatches - 1) {
      Utilities.sleep(1000); // 1秒待機
      Logger.log(`バッチ ${batchIndex + 1} 完了、1秒待機中...`);
    }
  }
  
  Logger.log(`=== 処理完了 ===`);
  Logger.log(`成功: ${successCount} 件`);
  Logger.log(`エラー: ${errorCount} 件`);
}


function testUpdateContactsFromSpreadsheet() {
  Logger.log('=== テスト実行開始 ===');
  
  const testDate = new Date('2023/12/15');
  const timestamp = Math.floor(testDate.getTime() / 1000);
  Logger.log(`日付変換テスト: ${testDate} -> ${timestamp} -> ${new Date(timestamp * 1000)}`);
  
  updateContactsFromSpreadsheet();
}