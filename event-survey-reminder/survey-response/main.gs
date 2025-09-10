const CUSTOM_FIELDS = {
  LAST_SURVEY_EVENT_DATE: 'last_survey_event_date'
};

const COLUMN_POSITIONS = {
  EMAIL: 2,
  EVENT_DATE: 3
};

function getConfig(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    Logger.log(`Config key '${key}' not found in script properties`);
  }
  return value;
}

function onFormSubmit(e) {
  const sheet = e.source.getActiveSheet();
  const row = e.range.getRow();
  
  const email = sheet.getRange(row, COLUMN_POSITIONS.EMAIL).getValue();
  // Date型で取得される
  const responseDate = sheet.getRange(row, COLUMN_POSITIONS.EVENT_DATE).getValue();
  
  if (email && responseDate) {
    try {
      Logger.log(`Processing survey response: ${email}, ${responseDate}`);
      const responseTimestamp = Math.floor(responseDate.getTime() / 1000);
      const fields = {};
      fields[CUSTOM_FIELDS.LAST_SURVEY_EVENT_DATE] = responseTimestamp;
      const result = SendGridLibrary.updateContact(email, fields);
      
      if (result) {
        Logger.log(`✓ Successfully updated contact ${email} with last_survey_event_date`);
      } else {
        Logger.log(`✗ Failed to update contact ${email}`);
      }
    } catch (error) {
      Logger.log(`✗ Error processing survey response for ${email}: ${error.message}`);
    }
  } else {
    Logger.log('Missing email or response date in survey response');
  }
}