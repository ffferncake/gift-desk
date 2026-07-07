const SPREADSHEET_ID = '18M8RELzWQDzhDwqDw-o9y8Ma8mGCDZ3FL0zkE3Dk8wU';
const SHEET_NAME = '축의대';

function doGet() {
  try {
    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();
    const count = Math.max(lastRow - 1, 0);
    let totalAmount = 0;
    let contributions = [];

    if (count > 0) {
      const rows = sheet.getRange(2, 1, count, 8).getValues();
      totalAmount = rows.reduce((sum, row) => sum + Number(row[4] || 0), 0);
      contributions = rows
        .map(function(row, index) {
          const createdAt = row[0] instanceof Date
            ? row[0].toISOString()
            : String(row[0] || '');

          return {
            rowNumber: index + 2,
            createdAt: createdAt,
            side: String(row[1] || ''),
            name: String(row[2] || ''),
            relation: String(row[3] || ''),
            amount: Number(row[4] || 0),
            payType: String(row[5] || ''),
            memo: String(row[6] || ''),
            id: String(row[7] || ''),
          };
        })
        .reverse();
    }

    return json_({
      count,
      totalAmount,
      contributions,
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

    if (data.action === 'update') {
      return updateContribution_(sheet, data.contribution || {});
    }

    if (data.action === 'delete') {
      return deleteContribution_(sheet, data.contribution || {});
    }

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

function updateContribution_(sheet, data) {
  const targetRow = findContributionRow_(sheet, data);

  if (!targetRow) {
    return json_({ saved: false, reason: 'not-found' });
  }

  sheet.getRange(targetRow, 1, 1, 8).setValues([[
    new Date(data.createdAt),
    data.side || '',
    data.name || '',
    data.relation || '',
    Number(data.amount || 0),
    data.payType || '',
    data.memo || '',
    data.id || '',
  ]]);

  return json_({ saved: true, updated: true, rowNumber: targetRow });
}

function deleteContribution_(sheet, data) {
  const targetRow = findContributionRow_(sheet, data);

  if (!targetRow) {
    return json_({ saved: false, reason: 'not-found' });
  }

  sheet.deleteRow(targetRow);

  return json_({ saved: true, deleted: true, rowNumber: targetRow });
}

function findContributionRow_(sheet, data) {
  const lastRow = sheet.getLastRow();
  const count = Math.max(lastRow - 1, 0);

  if (count === 0) {
    return 0;
  }

  let targetRow = Number(data.rowNumber || 0);

  if (data.id) {
    const ids = sheet.getRange(2, 8, count, 1).getValues();
    const rowOffset = ids.findIndex(function(row) {
      return String(row[0] || '') === String(data.id);
    });

    if (rowOffset !== -1) {
      targetRow = rowOffset + 2;
    }
  }

  if (!targetRow || targetRow < 2 || targetRow > lastRow) {
    return 0;
  }

  return targetRow;
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
