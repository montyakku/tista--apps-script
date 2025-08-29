const CUSTOM_FIELDS = {
  LAST_EVENT_ATTENDED_AT: 'last_event_attended_at'
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

function onFormSubmit(e) {
  const sheet = e.source.getActiveSheet();
  const row = e.range.getRow();
  
  const email = sheet.getRange(row, COLUMN_POSITIONS.EMAIL).getValue();
  const eventDate = sheet.getRange(row, COLUMN_POSITIONS.EVENT_DATE).getValue();
  
  if (email && eventDate) {
    try {
      Logger.log(`Processing event registration: ${email}, ${eventDate}`);
      const result = SendGridLibrary.updateContact(email, CUSTOM_FIELDS.LAST_EVENT_ATTENDED_AT, eventDate);
      
      if (result) {
        Logger.log(`✓ Successfully updated contact ${email} with last_event_attended_at`);
      } else {
        Logger.log(`✗ Failed to update contact ${email}`);
      }
    } catch (error) {
      Logger.log(`✗ Error processing event registration for ${email}: ${error.message}`);
    }
  } else {
    Logger.log('Missing email or event date in event registration');
  }
}