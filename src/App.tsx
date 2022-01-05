

// MintA (USDC - sol devnet) = 2tWC4JAdL4AxEFJySziYJfsAnW2MHKRo98vbAPiRDSk8
// MintB (Test USD - sol devnet) = 4QgnWUPQmfGB5dTDCcc4ZFeZDK7xNVhCUFoNmmYFwAme
// find out what OneSolprotocol is to the stable swap instr

import React, { useEffect, useMemo, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import {
  StableSwapLayout,
  SWAP_PROGRAM_ID as STABLE_SWAP_PROGRAM_ID,
} from "@saberhq/stableswap-sdk";
import Wallet from "@project-serum/sol-wallet-adapter"

import { AccountMeta, clusterApiUrl, Connection, PublicKey, SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js';
import { u64 } from '@solana/spl-token';

export async function loadAccount(
  connection: Connection,
  address: PublicKey,
  programId: PublicKey
): Promise<Buffer> {
  const accountInfo = await connection.getAccountInfo(address);
  if (accountInfo === null) {
    throw new Error("Failed to find account");
  }

  if (!accountInfo.owner.equals(programId)) {
    throw new Error(`Invalid owner: ${JSON.stringify(accountInfo.owner.toBase58())}`);
  }

  return Buffer.from(accountInfo.data);
}

// only info, no transactions
async function loadSaberStableSwap(
  {
    connection,
    address,
    programId = STABLE_SWAP_PROGRAM_ID,
  }: {
    connection: Connection;
    address: PublicKey,
    programId: PublicKey,
  }
): Promise<SaberStableSwapInfo> {

  const data = await loadAccount(connection, address, programId);
  const stableSwapData = StableSwapLayout.decode(data);

  if (!stableSwapData.isInitialized || stableSwapData.isPaused) {
    throw new Error(`Invalid token swap state`);
  }

  const authority = await PublicKey.createProgramAddress(
    [address.toBuffer()].concat(Buffer.from([stableSwapData.nonce])),
    programId
  );

  const tokenAccountA = new PublicKey(stableSwapData.tokenAccountA);
  const mintA = new PublicKey(stableSwapData.mintA);
  const adminFeeAccountA = new PublicKey(stableSwapData.adminFeeAccountA);
  const tokenAccountB = new PublicKey(stableSwapData.tokenAccountB);
  const mintB = new PublicKey(stableSwapData.mintB);
  const adminFeeAccountB = new PublicKey(stableSwapData.adminFeeAccountB);

  return new SaberStableSwapInfo(
    programId,
    address,
    authority,
    tokenAccountA,
    mintA,
    adminFeeAccountA,
    tokenAccountB,
    mintB,
    adminFeeAccountB
  );
}

// to move in utils
export class SaberStableSwapInfo {
  constructor(
    private programId: PublicKey,
    private swapInfo: PublicKey,
    private authority: PublicKey,
    private tokenAccountA: PublicKey,
    private mintA: PublicKey,
    private adminFeeAccountA: PublicKey,
    private tokenAccountB: PublicKey,
    private mintB: PublicKey,
    private adminFeeAccountB: PublicKey,
  ) {
    this.programId = programId;
    this.swapInfo = swapInfo;
    this.authority = authority;
    this.tokenAccountA = tokenAccountA;
    this.tokenAccountB = tokenAccountB;
    this.adminFeeAccountA = adminFeeAccountA;
    this.adminFeeAccountB = adminFeeAccountB;
  }

  toKeys(sourceMint: PublicKey): Array<AccountMeta> {
    const keys = [
      { pubkey: this.swapInfo, isSigner: false, isWritable: false },
      { pubkey: this.authority, isSigner: false, isWritable: false },
      { pubkey: this.tokenAccountA, isSigner: false, isWritable: true },
      { pubkey: this.tokenAccountB, isSigner: false, isWritable: true },
    ];

    if (sourceMint.equals(this.mintA)) {
      keys.push(
        { pubkey: this.adminFeeAccountB, isSigner: false, isWritable: true },
      );
    } else {
      keys.push(
        { pubkey: this.adminFeeAccountA, isSigner: false, isWritable: true },
      );
    }
    keys.push(
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: this.programId, isSigner: false, isWritable: false },
    );
    return keys;
  }
}




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


  // execute swap ( one to one)
  async function swap(
    {
      onesolProtocol,
      connection,
      fromMintKey,
      toMintKey,
      fromAccount,
      toAccount,
      route,
      slippage,
      instructions,
      signers,
      userTransferAuthority,
      feeTokenAccount,
      openOrders
    }:
      {
        onesolProtocol: OneSolProtocol,
        connection: Connection,
        wallet: any,
        fromMintKey: PublicKey,
        toMintKey: PublicKey,
        fromAccount: PublicKey,
        toAccount: PublicKey,
        route: DistributionRoute,
        slippage: number,
        instructions: TransactionInstruction[],
        signers: Signer[],
        userTransferAuthority: PublicKey,
        feeTokenAccount: PublicKey,
        openOrders?: PublicKey
      },
  ) {
    const {
      exchanger_flag,
      pubkey,
      program_id,
      amount_in,
      amount_out,
    } = route
  
    const amountIn = new u64(amount_in)
    const expectAmountOut = new u64(amount_out)
    const minimumAmountOut = new u64(amount_out * (1 - slippage))
  
    if ([EXCHANGER_SPL_TOKEN_SWAP, EXCHANGER_ORCA_SWAP, EXCHANGER_ONEMOON].includes(exchanger_flag)) {
      const splTokenSwapInfo = await loadTokenSwapInfo(
        connection,
        new PublicKey(pubkey),
        new PublicKey(program_id),
        null
      )
  
      await onesolProtocol.createSwapByTokenSwapInstruction({
        fromTokenAccountKey: fromAccount,
        toTokenAccountKey: toAccount,
        fromMintKey,
        toMintKey,
        userTransferAuthority,
        feeTokenAccount,
        amountIn,
        expectAmountOut,
        minimumAmountOut,
        splTokenSwapInfo,
      }, instructions, signers)
    
    } else if (exchanger_flag === EXCHANGER_SABER_STABLE_SWAP) {
      const stableSwapInfo = await loadSaberStableSwap({
        connection,
        address: new PublicKey(pubkey),
        programId: new PublicKey(program_id)
      })
      // 1sol-interface\src\utils\pools.tsx l600
      await onesolProtocol.createSwapBySaberStableSwapInstruction({
        fromTokenAccountKey: fromAccount,
        toTokenAccountKey: toAccount,
        fromMintKey,
        toMintKey,
        userTransferAuthority,
        feeTokenAccount,
        amountIn,
        expectAmountOut,
        minimumAmountOut,
        stableSwapInfo,
      }, instructions, signers)
    }
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
