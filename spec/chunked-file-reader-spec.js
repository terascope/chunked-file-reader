'use strict';

const Promise = require('bluebird');
const chunkedFileReader = require('../index.js');


const mockLogger = {
    error: msg => msg
};

function mockReader(offset) {
    switch (offset) {
    case 0:
        // Start slice
        return new Promise(resolve => resolve('{"test1": "data"}\n{"test2": "data"}\n{"test3": "data"'));
    case 5:
        // Margin for start slice
        return new Promise(resolve => resolve('}\n{"test4": "data"}\n'));
    case 10:
        // middle slice ending with complete record
        return new Promise(resolve => resolve('\n{"test4": "data"}\n{"test5": "data"}\n{"test6": "data"}\n'));
    case 20:
        // End slice with partial record at start
        return new Promise(resolve => resolve('{"test6": "data"}\n{"test7": "data"}\n{"test8": "data"}\n'));
    default:
        return new Error('bad offset!!');
    }
}

const opConfig = {
    delimiter: '\n',
    format: 'json'
};

// This will test both a starting slice and the margin collection
const startSlice = {
    offset: 0,
    length: 5,
    total: 30
};

// This will verify the margin is not collected on a middle slice ending in a complete record. Also
// verifies a slice starting with a complete record
const middleSlice = {
    offset: 10,
    length: 10,
    total: 30
};

// Tests an end slice that starts with a partial record
const endSlice = {
    offset: 20,
    length: 10,
    total: 30
};

// Used to test average record size calculation
const testData = [
    '{"test1":"data"}',
    '{"test2":"data"}',
    '{"test3":"data"}',
    '{"test4":"data"}',
    '{"test5":"data"}',
    '{"test6":"data"}',
    '{"test7":"data"}',
    '{"test8":"data"}'
];


describe('The chunked file reader', () => {
    it('properly handles a start slice and margin collection.', (done) => {
        chunkedFileReader.getChunk(mockReader, startSlice, opConfig, mockLogger)
            .then((data) => {
                expect(data).toEqual([{ test1: 'data' }, { test2: 'data' }, { test3: 'data' }]);
                done();
            });
    });
    it('properly handles a middle slice with a complete record and without margin '
        + 'collection.', (done) => {
        chunkedFileReader.getChunk(mockReader, middleSlice, opConfig, mockLogger)
            .then((data) => {
                expect(data).toEqual([{ test4: 'data' }, { test5: 'data' }, { test6: 'data' }]);
                done();
            });
    });
    it('properly handles a end slice starting with a partial record.', (done) => {
        chunkedFileReader.getChunk(mockReader, endSlice, opConfig, mockLogger)
            .then((data) => {
                expect(data).toEqual([{ test7: 'data' }, { test8: 'data' }]);
                done();
            });
    });
    it('accurately calculates average record size.', () => {
        const avgSize = chunkedFileReader._averageRecordSize(testData);
        expect(avgSize).toEqual(16);
    });
    describe('as a slicer would use it', () => {
        fit('properly handles partial records.', (done) => {
            const chunks = [
                '{"test1":"',
                'data"}\n{"t',
                '"est2":"da',
                'ta"}\n',
            ];
            function reader(offset, length) {
                return new Promise(resolve => resolve(chunks.shift()));
            }
            const slices = [
                { offset: 0, length: 10, total: 35 },
                { offset: 10, length: 10, total: 35 },
                { offset: 20, length: 10, total: 35 },
                { offset: 30, length: 5, total: 35 },
            ];
            const records = [];
            slices.forEach((slice) => {
                chunkedFileReader.getChunk(reader, slice, opConfig, mockLogger)
                    .then(rec => {
                        console.log('RECORD:', rec);
                        records.push(rec);
                    });
            });
            console.log('RECORDS:', records);
            expect(records.length).toEqual(2);
            expect(records[0]).toEqual('{"test1":"data"}');
            expect(records[1]).toEqual('{"test2":"data"}');
            done();
        });
    });
});
