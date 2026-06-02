import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new Horizon.Server(HORIZON_URL);

interface DonationParams {
  destinationAddress: string;
  amountXlm: string;
  memo?: string;
}

async function buildDonationTransaction(
  sourceAddress: string,
  params: DonationParams
): Promise<string> {
  const account = await server.loadAccount(sourceAddress);

  const builder = new TransactionBuilder(account, {
    fee: (await server.fetchBaseFee()).toString(),
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: params.destinationAddress,
        asset: Asset.native(),
        amount: params.amountXlm,
      })
    )
    .setTimeout(30);

  if (params.memo) {
    builder.addMemo({ value: params.memo, type: 'text' } as any);
  }

  return builder.build().toXDR();
}

async function signWithFreighter(xdr: string): Promise<string> {
  const freighter = (window as any).freighter;
  if (!freighter) throw new Error('Freighter extension not found');

  const signedXdr: string = await freighter.signTransaction(xdr, {
    networkPassphrase: Networks.TESTNET,
  });
  return signedXdr;
}

async function submitTransaction(signedXdr: string): Promise<string> {
  const tx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
  const result = await server.submitTransaction(tx as any);
  return (result as any).hash;
}

// --- UI wiring ---

function setStatus(message: string, isError = false) {
  const el = document.getElementById('status');
  if (!el) return;
  el.textContent = message;
  el.className = isError ? 'status error' : 'status success';
  el.style.display = 'block';
}

function setLoading(loading: boolean) {
  const btn = document.getElementById('donate-btn') as HTMLButtonElement | null;
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'Processing…' : 'Donate';
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('donation-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sourceAddress = ((document.getElementById('source-address') as HTMLInputElement)?.value ?? '').trim();
    const destination = ((document.getElementById('destination') as HTMLInputElement)?.value ?? '').trim();
    const amount = ((document.getElementById('amount') as HTMLInputElement)?.value ?? '').trim();
    const memo = ((document.getElementById('memo') as HTMLInputElement)?.value ?? '').trim();

    if (!sourceAddress || !destination || !amount) {
      setStatus('Please fill in all required fields.', true);
      return;
    }

    setLoading(true);
    setStatus('');

    try {
      setStatus('Building transaction…');
      const xdr = await buildDonationTransaction(sourceAddress, {
        destinationAddress: destination,
        amountXlm: amount,
        memo: memo || undefined,
      });

      setStatus('Waiting for Freighter signature…');
      const signedXdr = await signWithFreighter(xdr);

      setStatus('Submitting to Horizon testnet…');
      const txHash = await submitTransaction(signedXdr);

      setStatus(`Donation successful! TX: ${txHash.slice(0, 12)}…`);
    } catch (err: any) {
      const detail =
        err?.response?.data?.extras?.result_codes?.transaction ??
        err?.message ??
        'Unknown error';
      setStatus(`Transaction failed: ${detail}`, true);
    } finally {
      setLoading(false);
    }
  });
});
