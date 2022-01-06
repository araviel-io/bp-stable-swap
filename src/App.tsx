
// MintA (USDC - sol devnet) = 2tWC4JAdL4AxEFJySziYJfsAnW2MHKRo98vbAPiRDSk8
// MintB (Test USD - sol devnet) = 4QgnWUPQmfGB5dTDCcc4ZFeZDK7xNVhCUFoNmmYFwAme
// find out what OneSolprotocol is to the stable swap instr

import React, { useEffect, useMemo, useState } from 'react';
import logo from './logo.svg';

import { AccountMeta, clusterApiUrl, Connection, PublicKey, SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js';
import { u64 } from '@solana/spl-token';
import './App.css';
/*import {
  StableSwap,
  StableSwapLayout,
  SWAP_PROGRAM_ID as STABLE_SWAP_PROGRAM_ID,
} from "@saberhq/stableswap-sdk";*/
import Wallet from "@project-serum/sol-wallet-adapter"


import { StableSwap } from "./lib/stable-swap";




function App() {

  const network = clusterApiUrl('devnet');
  const [providerUrl, setProviderUrl] = useState('https://wallet.safecoin.org/');
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
/*
  async function askNewSwap() {
    const newSwap = await StableSwap.createStableSwap(
      connection,
      payer,
      stableSwapAccount,
      authority,
      owner.publicKey,
      adminAccountA,
      adminAccountB,
      mintA.publicKey,
      tokenAccountA,
      mintB.publicKey,
      tokenAccountB,
      tokenPool.publicKey,
      userPoolAccount,
      mintA.publicKey,
      mintB.publicKey,
      stableSwapProgramId,
      TOKEN_PROGRAM_ID,
      nonce,
      AMP_FACTOR
    );

    console.log("Payer KP: ", payer.secretKey.toString());
    console.log("Owner KP: ", owner.secretKey.toString());
    console.log("MintA: ", mintA.publicKey.toString());
    console.log("MintB: ", mintB.publicKey.toString());
    console.log("FeeAccountA: ", newSwap.adminFeeAccountA.toString());
    console.log("FeeAccountB: ", newSwap.adminFeeAccountB.toString());
    console.log("Address: ", newSwap.stableSwap.toString());
    console.log("ProgramID: ", newSwap.swapProgramId.toString());
  }

*/




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

          {/*<button style={{ background: "green", padding: "8px", margin: "6px" }} onClick={swap}>unWrap</button>*/}
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
