import { runCalculationShard, type Hand, type ShardResult } from './poker';

type Request = { hand: Hand; workerIndex: number; workerCount: number; seed: number };
const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage: (message: ShardResult) => void;
};

workerScope.onmessage = ({ data }) => {
  runCalculationShard(data.hand, data.workerIndex, data.workerCount, data.seed, result => workerScope.postMessage(result));
};

export {};
