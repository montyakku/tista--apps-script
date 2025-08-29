const TEST_CONFIG = {
  EMAIL: 'test@example.com',
  RESPONSE_DATE: new Date('2024-01-01')
};

function testSurveyResponse() {
  Logger.log('=== Testing Survey Response Function ===');
  
  const mockEvent = {
    source: {
      getActiveSheet: () => ({
        getRange: (row, col) => ({
          getValue: () => {
            if (col === COLUMN_POSITIONS.EMAIL) return TEST_CONFIG.EMAIL;
            if (col === COLUMN_POSITIONS.EVENT_DATE) return TEST_CONFIG.RESPONSE_DATE;
            return null;
          }
        })
      })
    },
    range: {
      getRow: () => 2
    }
  };
  
  try {
    Logger.log(`Testing onFormSubmit with: ${TEST_CONFIG.EMAIL}, ${TEST_CONFIG.RESPONSE_DATE}`);
    onFormSubmit(mockEvent);
    Logger.log('✓ Survey response function test completed');
    return true;
    
  } catch (error) {
    Logger.log(`✗ Survey response function test error: ${error.message}`);
    return false;
  }
}

function testLibraryConnection() {
  Logger.log('=== Testing SendGrid Library Connection ===');
  
  try {
    if (typeof SendGridLibrary !== 'undefined') {
      Logger.log('✓ SendGridLibrary library is loaded');
      
      const testEmail = TEST_CONFIG.EMAIL;
      const contactId = SendGridLibrary.findContactByEmail(testEmail);
      
      if (contactId) {
        Logger.log(`✓ Found contact: ${contactId}`);
      } else {
        Logger.log(`✗ Contact not found for: ${testEmail}`);
      }
      
      return true;
      
    } else {
      Logger.log('✗ SendGridLibrary library is not loaded');
      return false;
    }
    
  } catch (error) {
    Logger.log(`✗ Library connection test error: ${error.message}`);
    return false;
  }
}

function runAllTests() {
  Logger.log('=== Survey Response Tests ===');
  
  Logger.log('\n1. Testing Library Connection...');
  testLibraryConnection();
  
  Logger.log('\n2. Testing Survey Response Function...');
  testSurveyResponse();
  
  Logger.log('\n=== Survey Response Tests Completed ===');
}