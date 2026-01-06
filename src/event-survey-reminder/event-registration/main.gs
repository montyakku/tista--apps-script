const CUSTOM_FIELDS = {
  RECENT_EVENT_ATTENDED_DATES: 'recent_event_attended_dates'
};

const COLUMN_POSITIONS = {
  EMAIL: 2,
  EVENT_DATE: 4
};

function getConfig(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    Logger.log(`Config key '${key}' not found in script properties`);
  }
  return value;
}

/**
 * 日付をYYYYMMDD形式にフォーマット
 */
function formatDateToYYYYMMDD(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyyMMdd');
}

/**
 * 今日より前の日付を除外し、新しい日付を追加
 */
function mergeAndFilterDates(existingDatesStr, newDate) {
  const todayStr = formatDateToYYYYMMDD(new Date());

  // 既存の日付を配列に変換
  let dates = existingDatesStr ? existingDatesStr.split(',') : [];

  // 今日以降の日付のみフィルタリング（YYYYMMDD形式の文字列比較）
  dates = dates.filter(dateStr => dateStr.length === 8 && dateStr >= todayStr);

  // 新しい日付を追加（重複チェック）
  const newDateStr = formatDateToYYYYMMDD(newDate);
  if (!dates.includes(newDateStr)) {
    dates.push(newDateStr);
  }

  // ソート（古い順）
  dates.sort();

  return dates.join(',');
}

function onFormSubmit(e) {
  const sheet = e.source.getActiveSheet();
  const row = e.range.getRow();

  const email = sheet.getRange(row, COLUMN_POSITIONS.EMAIL).getValue();
  // Date型で取得される
  const eventDate = sheet.getRange(row, COLUMN_POSITIONS.EVENT_DATE).getValue();

  if (email && eventDate) {
    try {
      Logger.log(`Processing event registration: ${email}, ${eventDate}`);

      // 既存の連絡先情報を取得
      let existingDates = '';
      let contactExists = false;

      try {
        const contactId = SendGridLibrary.findContactByEmail(email);
        if (contactId) {
          contactExists = true;
          const contact = SendGridLibrary.findContactById(contactId);
          Logger.log(`Contact object: ${JSON.stringify(contact)}`);

          // custom_fieldsは配列なので、nameでフィールドを検索
          if (contact.custom_fields && Array.isArray(contact.custom_fields)) {
            const field = contact.custom_fields.find(f => f.name === CUSTOM_FIELDS.RECENT_EVENT_ATTENDED_DATES);
            existingDates = field && field.value ? String(field.value) : '';
          }

          Logger.log(`Existing dates for ${email}: '${existingDates}'`);
        } else {
          Logger.log(`Contact not found for ${email}, will create new`);
        }
      } catch (error) {
        Logger.log(`Error fetching contact: ${error.message}`);
      }

      // 日付をマージしてフィルタリング
      const updatedDates = mergeAndFilterDates(existingDates, eventDate);
      Logger.log(`Merged dates - Before: '${existingDates}' -> After: '${updatedDates}'`);

      // 連絡先が存在する場合は updateContactFields、存在しない場合は updateContact（新規作成含む）
      const fields = {};
      fields[CUSTOM_FIELDS.RECENT_EVENT_ATTENDED_DATES] = updatedDates;

      let result;
      if (contactExists) {
        // 既存連絡先を更新（上書きを防ぐ）
        result = SendGridLibrary.updateContactFields(email, fields);
        Logger.log(`Used updateContactFields for existing contact`);
      } else {
        // 新規作成
        result = SendGridLibrary.updateContact(email, fields);
        Logger.log(`Used updateContact for new contact`);
      }

      if (result) {
        Logger.log(`✓ Successfully updated contact ${email} with recent_event_attended_dates: ${updatedDates}`);
      } else {
        Logger.log(`✗ Failed to update contact ${email}`);
      }
    } catch (error) {
      Logger.log(`✗ Error processing event registration for ${email}: ${error.message}`);
      Logger.log(`Stack trace: ${error.stack}`);
    }
  } else {
    Logger.log('Missing email or event date in event registration');
  }
}
