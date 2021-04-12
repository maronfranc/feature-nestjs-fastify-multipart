import * as sinon from 'sinon';
import { expect } from 'chai';
import { filterAsyncGenerator } from '../../../multipart/utils';

describe('filterAsyncGenerator', () => {
  const testArray = [1, 2, 3, 4, 5];
  async function* asyncGeneratorToFilter() {
    for (const number of testArray) {
      yield number;
    }
  }
  const filterCondition = (value: number) => value > 3;

  describe('filter', () => {
    it('should not add filtered values into async generator', async () => {
      const filteredAsyncGenerator = filterAsyncGenerator<number>(
        asyncGeneratorToFilter(),
        async value => filterCondition(value),
      );
      for await (const value of filteredAsyncGenerator) {
        expect(filterCondition(value)).to.be.true;
      }
    });
    // describe('if all values return true', () => {
    // 	it('behave as identity', async () => {
    // 		const filteredAsyncGenerator = filterAsyncGenerator<number>(asyncGeneratorToFilter(), async () => true);
    // 		let index = 0;
    // 		for await (const value of filteredAsyncGenerator) {
    // 			expect(value).to.equal(testArray[index]);
    // 			index++;
    // 		}
    // 	});
    // });
    // describe('if all values return true', () => {
    // 	it('should not yield any value', async () => {
    // 		const calledFalse = (value: number) => value;
    // 		const filteredAsyncGenerator = filterAsyncGenerator<number>(asyncGeneratorToFilter(), async () => false);
    // 		const calledFalseSpy = sinon.spy(calledFalse);
    // 		for await (const value of filteredAsyncGenerator) {
    // 			calledFalse(value);
    // 		}
    // 		expect(calledFalseSpy.called).to.be.false;
    // 	});
    // });
  });
});
