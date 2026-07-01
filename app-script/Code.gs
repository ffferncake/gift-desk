const SPREADSHEET_ID = '18M8RELzWQDzhDwqDw-o9y8Ma8mGCDZ3FL0zkE3Dk8wU';
const SHEET_NAME = '축의대';

function doGet() {
  try {
    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();
    const count = Math.max(lastRow - 1, 0);
    let totalAmount = 0;

    if (count > 0) {
      const amounts = sheet.getRange(2, 5, count, 1).getValues();
      totalAmount = amounts.reduce((sum, row) => sum + Number(row[0] || 0), 0);
    }

    return json_({
      count,
      totalAmount,
      sheetName: SHEET_NAME,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return json_({
      saved: false,
      error: String(error && error.message ? error.message : error),
    });
  }
}

function doPost(e) {
  try {
    const sheet = getSheet_();
    const data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      new Date(data.createdAt),
      data.side || '',
      data.name || '',
      data.relation || '',
      Number(data.amount || 0),
      data.payType || '',
      data.memo || '',
      data.id || '',
    ]);

    return json_({ saved: true });
  } catch (error) {
    return json_({
      saved: false,
      error: String(error && error.message ? error.message : error),
    });
  }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (!spreadsheet) {
    throw new Error('Spreadsheet not found. Check SPREADSHEET_ID and script permissions.');
  }

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['시간', '구분', '이름', '관계', '금액', '방식', '메모', 'ID']);
    sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
    sheet.getRange('E:E').setNumberFormat('#,##0');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
