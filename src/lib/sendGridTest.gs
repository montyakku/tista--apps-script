// テスト用の定数（実際の値に変更してください）
const TEST_EMAILS = {
  EXISTING: 'test@example.com',      // 既存のContact用
  NEW: 'newtest@example.com',       // 新規作成用
  UPDATE: 'updatetest@example.com'  // 更新テスト用
};

const TEST_CUSTOM_FIELD = 'last_event_attended_at';
const TEST_DATE = '2024-01-01';
const TEST_SEARCH_QUERY = "email LIKE 'test@example.com'";

function testLibraryConfiguration() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('SENDGRID_API_KEY');
  
  if (apiKey && apiKey.length > 10) {
    Logger.log('✓ SendGrid API Key is configured');
    return true;
  } else {
    Logger.log('✗ SendGrid API Key is not configured');
    return false;
  }
}

function testFindContactByEmail() {
  const testEmail = TEST_EMAILS.EXISTING;
  
  Logger.log(`Testing findContactByEmail with: ${testEmail}`);
  
  try {
    const contactId = findContactByEmail(testEmail);
    
    if (contactId) {
      Logger.log(`✓ Contact found - ID: ${contactId}`);
    } else {
      Logger.log(`✗ Contact not found for email: ${testEmail}`);
    }
    
    return contactId;
    
  } catch (error) {
    Logger.log(`✗ Error occurred: ${error.message}`);
    return null;
  }
}

function testCreateContact() {
  const testEmail = TEST_EMAILS.NEW;
  
  Logger.log(`Testing createContact with: ${testEmail}`);
  
  try {
    const contactId = createContact(testEmail);
    
    if (contactId) {
      Logger.log(`✓ Contact created - ID: ${contactId}`);
    } else {
      Logger.log(`✗ Failed to create contact for: ${testEmail}`);
    }
    
    return contactId;
    
  } catch (error) {
    Logger.log(`✗ Error occurred: ${error.message}`);
    return null;
  }
}

function testUpdateContact() {
  const testEmail = TEST_EMAILS.UPDATE;
  const customField = TEST_CUSTOM_FIELD;
  const testDate = TEST_DATE;
  
  Logger.log(`Testing updateContact with: ${testEmail}`);
  Logger.log(`Custom field: ${customField}, Value: ${testDate}`);
  
  try {
    const result = updateContact(testEmail, customField, testDate);
    
    if (result) {
      Logger.log(`✓ Contact updated successfully`);
    } else {
      Logger.log(`✗ Failed to update contact`);
    }
    
    return result;
    
  } catch (error) {
    Logger.log(`✗ Error occurred: ${error.message}`);
    return false;
  }
}

function testSearchContacts() {
  const query = TEST_SEARCH_QUERY;
  
  Logger.log(`Testing searchContacts with query: ${query}`);
  
  try {
    const contacts = searchContacts(query);
    
    Logger.log(`✓ Found ${contacts.length} contacts`);
    
    if (contacts.length > 0) {
      contacts.forEach((contact, index) => {
        Logger.log(`Contact ${index + 1}: ${contact.email} (ID: ${contact.id})`);
      });
    }
    
    return contacts;
    
  } catch (error) {
    Logger.log(`✗ Error occurred: ${error.message}`);
    return [];
  }
}

function runAllTests() {
  Logger.log('=== SendGrid Library Tests ===');
  Logger.log('テスト用定数:');
  Logger.log(`EXISTING: ${TEST_EMAILS.EXISTING}`);
  Logger.log(`NEW: ${TEST_EMAILS.NEW}`);
  Logger.log(`UPDATE: ${TEST_EMAILS.UPDATE}`);
  Logger.log('');
  
  Logger.log('1. Testing Configuration...');
  testLibraryConfiguration();
  
  Logger.log('\n2. Testing Find Contact...');
  testFindContactByEmail();
  
  Logger.log('\n3. Testing Create Contact...');
  testCreateContact();
  
  Logger.log('\n4. Testing Update Contact...');
  testUpdateContact();
  
  Logger.log('\n5. Testing Search Contacts...');
  testSearchContacts();
  
  Logger.log('\n=== Tests completed ===');
  Logger.log('実際のテストを行う場合は、ファイル冒頭の定数を実際の値に変更してください。');
}