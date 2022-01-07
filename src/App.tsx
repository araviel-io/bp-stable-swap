
// MintA (USDC - sol devnet) = 2tWC4JAdL4AxEFJySziYJfsAnW2MHKRo98vbAPiRDSk8
// MintB (Test USD - sol devnet) = 4QgnWUPQmfGB5dTDCcc4ZFeZDK7xNVhCUFoNmmYFwAme
// find out what OneSolprotocol is to the stable swap instr

import React, { useEffect, useMemo, useState } from 'react';
import logo from './logo.svg';

import { Account, AccountMeta, clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Signer, SYSVAR_CLOCK_PUBKEY, Transaction } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID, u64 } from '@solana/spl-token';
import './App.css';
/*import {
  StableSwap,
  StableSwapLayout,
  SWAP_PROGRAM_ID as STABLE_SWAP_PROGRAM_ID,
} from "@saberhq/stableswap-sdk";*/
import Wallet from "@project-serum/sol-wallet-adapter"
import { sendAndConfirmTransactionWithTitle } from './test/helpers';
import { IExchange, StableSwap } from '@saberhq/stableswap-sdk';
import { sleep, SPLToken } from '@saberhq/token-utils';

//import { StableSwap } from "@saberhq/stableswap-sdk";
//import { StableSwap } from "./lib/stable-swap";
//import { getDeploymentInfo, newAccountWithLamports, sleep } from './lib/helpers';





function App() {

  const network = clusterApiUrl('devnet');
  const [providerUrl, setProviderUrl] = useState('https://www.sollet.io/');
  const connection = useMemo(() => new Connection(network), [network]);
  const urlWallet = useMemo(
    () => new Wallet(providerUrl, network),
    [providerUrl, network],
  );
  const [selectedWallet, setSelectedWallet] = useState<
    Wallet | undefined | null
  >(undefined);
  const [, setConnected] = useState(false);

  useEffect(() => {
    if (selectedWallet) {
      selectedWallet.on('connect', () => {
        setConnected(true);
        console.log(
          `Connected to wallet ${selectedWallet.publicKey?.toBase58() ?? '--'}`,
        );
      });
      selectedWallet.on('disconnect', () => {
        setConnected(false);
        console.log('Disconnected from wallet');
      });
      void selectedWallet.connect();
      return () => {
        void selectedWallet.disconnect();
      };
    }
  }, [selectedWallet]);


  // Cluster connection
  //let connection: Connection;
  // Fee payer
  let payer: Signer;
  // owner of the user accounts
  let owner: Signer;
  // Token pool
  let tokenPool: SPLToken;
  let userPoolAccount: PublicKey;
  // Tokens swapped
  let mintA: SPLToken;
  // USDC WALLET ASSOCIATED : EofXi6JscoSurjXn944Ck69mcXTgyJnBhZBjmwJo7375
  let mintB: SPLToken;
  // TEST USD WALLET ASSOCIATED : EofXi6JscoSurjXn944Ck69mcXTgyJnBhZBjmwJo7375
  let tokenAccountA: PublicKey;
  // USDC DEV 2tWC4JAdL4AxEFJySziYJfsAnW2MHKRo98vbAPiRDSk8
  let tokenAccountB: PublicKey;
  // Test USD 4QgnWUPQmfGB5dTDCcc4ZFeZDK7xNVhCUFoNmmYFwAme
  
  // Admin fee accounts
  let adminFeeAccountA: PublicKey;
  let adminFeeAccountB: PublicKey;
  // Stable swap
  let exchange: IExchange;
  let stableSwap: StableSwap;
  let stableSwapAccount: Keypair;
  let stableSwapProgramId: PublicKey;

  async function askNewSwap() {

    // Swap accounts before swap
    const oldSwapTokenA = await mintA.getAccountInfo(tokenAccountA);
    const oldSwapTokenB = await mintB.getAccountInfo(tokenAccountB);
    // Amount passed to swap instruction
    const SWAP_AMOUNT_IN = 100000;
    // Creating swap token a account
    const userAccountA = await mintA.createAccount(owner.publicKey);
    await mintA.mintTo(userAccountA, owner, [], SWAP_AMOUNT_IN);
    // Creating swap token b account
    const userAccountB = await mintB.createAccount(owner.publicKey);
    // Make sure all token accounts are created and approved
    await sleep(500);

    let txReceipt = null;
    // Swapping
    const txn = new Transaction().add(
      stableSwap.swap({
        userAuthority: owner.publicKey,
        userSource: userAccountA, // User source token account            | User source -> Swap source
        poolSource: tokenAccountA, // Swap source token account
        poolDestination: tokenAccountB, // Swap destination token account | Swap dest -> User dest
        userDestination: userAccountB, // User destination token account
        amountIn: new u64(SWAP_AMOUNT_IN),
        minimumAmountOut: new u64(0), // To avoid slippage errors
      })
    );
    const txSig = await sendAndConfirmTransactionWithTitle(
      "swap",
      connection,
      txn,
      payer,
      owner
    );
    txReceipt = await connection.getConfirmedTransaction(txSig, "confirmed");
    // Make sure swap was complete
    await sleep(500);

    let info = await mintA.getAccountInfo(userAccountA);
    //expect(info.amount.toNumber()).toBe(0);
    info = await mintA.getAccountInfo(tokenAccountA);
    /*expect(info.amount.toNumber()).toBe(
      oldSwapTokenA.amount.toNumber() + SWAP_AMOUNT_IN
    );*/
    const EXPECTED_AMOUNT_OUT = 75000; // EXPECTED_AMOUNT_OUT = SWAP_AMOUNT_IN * (1 - FEES)
    info = await mintB.getAccountInfo(userAccountB);
    //expect(info.amount.toNumber()).toBe(EXPECTED_AMOUNT_OUT);
    info = await mintB.getAccountInfo(tokenAccountB);
    /*expect(info.amount.toNumber()).toBe(
      oldSwapTokenB.amount.toNumber() - EXPECTED_AMOUNT_OUT
    );*/

    //const logMessages = parseEventLogs(txReceipt?.meta?.logMessages);
    /*
    expect(logMessages).toEqual([
      {
        type: "SwapAToB",
        tokenAAmount: new u64(SWAP_AMOUNT_IN),
        tokenBAmount: new u64(EXPECTED_AMOUNT_OUT),
        fee: new u64(0x61a8),
      },
    ]);*/


  }




  return (
    <div className="App">
      <h1>Stable swap playground</h1>
      <div>Network: {network}</div>
      <div>
        Waller provider:{' '}
        <input
          type="text"
          value={providerUrl}
          onChange={(e) => setProviderUrl(e.target.value.trim())}
        />
      </div>
      {selectedWallet && selectedWallet.connected ? (
        <div style={{ marginTop: "10px" }}>
          <div>Wallet address: {selectedWallet.publicKey?.toBase58()}.</div>

          <button style={{ background: "green", padding: "8px", margin: "6px" }} onClick={askNewSwap}>unWrap</button>
          <button style={{ color: "white", background: "black", padding: "8px", margin: "6px" }} onClick={() => selectedWallet.disconnect()}>
            Disconnect
          </button>
          <div></div>
        </div>
      ) : (
        <div>
          <button style={{ background: "green", padding: "3px", margin: "6px" }} onClick={() => setSelectedWallet(urlWallet)}>
            Connect to Wallet
          </button>

        </div>
      )}

    </div>
  );
}

export default App;
