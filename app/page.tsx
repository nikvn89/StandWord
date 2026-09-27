"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpenCheck,
  Check,
  CircleDot,
  Clipboard,
  CornerDownLeft,
  ExternalLink,
  Fingerprint,
  GitCompareArrows,
  History,
  LoaderCircle,
  LockKeyhole,
  PenLine,
  RefreshCw,
  Search,
  ShieldCheck,
  Undo2,
  Users,
  Wallet,
} from "lucide-react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant, type CalldataEncodable } from "genlayer-js/types";
import { keccak256, toBytes } from "viem";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

const CONTRACT_ADDRESS = "0xA701A047BE663dA232A068A1029E48f98c7bE521" as const;
const DEPLOY_TX = "0xc661ae5362281cf4bd6e1a0eb24f64e64b140828e37f80a18b31a71c88fc1391";
const RPC_URL = "https://studio.genlayer.com/api";
const EXPLORER_URL = `https://explorer-studio.genlayer.com/address/${CONTRACT_ADDRESS}`;
const SOURCE_SHA = "0695bb114b13f9921ee39db7a5afdf6d36e367339b258a257d404afaddbcd024";
const chain = { ...studionet, rpcUrls: { default: { http: [RPC_URL] } } };
const readClient = createClient({ chain });

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
};

type Limits = {
  max_topic_length: number;
  max_position_text_length: number;
  max_followup_text_length: number;
  max_relier_label_length: number;
  max_followups_per_position: number;
  max_model_calls_per_position: number;
  max_reliances_per_position: number;
  max_page_size: number;
};

type Position = {
  position_id: string;
  creator: string;
  topic: string;
  position_text: string;
  state: "STANDING" | "WALKED_BACK" | string;
  followup_count: number;
  model_calls: number;
  reliance_count: number;
  standing_reliance_count: number;
  walked_back_followup_id: string;
};

type Followup = {
  followup_id: string;
  position_id: string;
  text: string;
  outcome: "KEEPS_PRIOR" | "NARROWS_PRIOR" | string;
  outcome_code: number;
  index: number;
};

type Reliance = {
  position_id: string;
  wallet: string;
  label: string;
  active: boolean;
  index?: number;
};

type LoadedRecord = {
  position: Position;
  followups: Followup[];
  reliances: Reliance[];
  ownReliance: Reliance | null;
};

type TxRecord = { label: string; status: string; hash: string };
type ActionTab = "followup" | "reliance";

type ModelContext = {
  registerTool(
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
      execute(input: unknown): unknown | Promise<unknown>;
    },
    options?: { signal?: AbortSignal },
  ): void | Promise<void>;
};

declare global {
  interface Window { ethereum?: EthereumProvider }
  interface Document { modelContext?: ModelContext }
}

const compact = (value: string, start = 7, end = 5) => value ? `${value.slice(0, start)}…${value.slice(-end)}` : "—";
const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);
const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function cleanPositionId(value: string) {
  const id = value.trim().replace(/^0x/i, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(id)) throw new Error("Position ID must contain exactly 64 hexadecimal characters.");
  return id;
}

function derivePositionId(creator: string, topic: string) {
  const cleanTopic = topic.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(creator)) throw new Error("Connect a valid wallet before deriving the position ID.");
  if (!cleanTopic) throw new Error("Enter a topic first.");
  const payload = `PRIOR_WORD_BIND:POSITION:V1|${creator.toLowerCase()}|${[...cleanTopic].length}|${cleanTopic}`;
  return keccak256(toBytes(payload)).slice(2);
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}{hint ? <small>{hint}</small> : null}</span>{children}</label>;
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  return (
    <button className="copy-button" type="button" onClick={() => void navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied`))}>
      <Clipboard aria-hidden="true" /> <span>{label}</span>
    </button>
  );
}

function StateBadge({ state }: { state: string }) {
  const walkedBack = state === "WALKED_BACK";
  return <span className={`state-badge ${walkedBack ? "walked-back" : "standing"}`}><CircleDot />{state || "UNKNOWN"}</span>;
}

export default function Home() {
  const [account, setAccount] = useState("");
  const [limits, setLimits] = useState<Limits | null>(null);
  const [topic, setTopic] = useState("Release audit coverage");
  const [positionText, setPositionText] = useState("We will publish the audit report for every release.");
  const [positionId, setPositionId] = useState("");
  const [record, setRecord] = useState<LoadedRecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [activeTab, setActiveTab] = useState<ActionTab>("followup");
  const [followupText, setFollowupText] = useState("");
  const [relierLabel, setRelierLabel] = useState("Independent release user");
  const [pendingAction, setPendingAction] = useState("");
  const [lastTx, setLastTx] = useState<TxRecord | null>(null);

  const derivedId = useMemo(() => {
    try { return account && topic.trim() ? derivePositionId(account, topic) : ""; }
    catch { return ""; }
  }, [account, topic]);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) throw new Error("No EVM-compatible wallet was found. Install or unlock MetaMask first.");
    const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
    const wallet = accounts[0];
    if (!wallet) throw new Error("Wallet connection was not approved.");
    const chainHex = (await window.ethereum.request({ method: "eth_chainId" })) as string;
    if (Number(BigInt(chainHex)) !== 61999) {
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xf22f" }] });
      } catch {
        throw new Error("Switch MetaMask to GenLayer StudioNet (chain ID 61999), then connect again.");
      }
    }
    setAccount(wallet);
    toast.success("Wallet connected", { description: compact(wallet) });
    return wallet;
  }, []);

  useEffect(() => {
    if (!window.ethereum?.on) return;
    const accountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[] | undefined;
      setAccount(accounts?.[0] ?? "");
    };
    const chainChanged = () => window.location.reload();
    window.ethereum.on("accountsChanged", accountsChanged);
    window.ethereum.on("chainChanged", chainChanged);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", accountsChanged);
      window.ethereum?.removeListener?.("chainChanged", chainChanged);
    };
  }, []);

  useEffect(() => {
    void readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_limits",
      args: [],
      transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
    }).then((value) => setLimits(value as Limits)).catch((error) => toast.error("StudioNet could not be reached", { description: errorMessage(error) }));
  }, []);

  const waitForFinal = useCallback(async (hash: string) => {
    const started = Date.now();
    while (Date.now() - started < 12 * 60 * 1000) {
      const response = await fetch(RPC_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionByHash", params: [hash] }),
      });
      const payload = (await response.json()) as { result?: { status?: string } };
      const status = payload.result?.status;
      if (status) setLastTx((current) => current ? { ...current, status } : current);
      if (status === "FINALIZED") return;
      if (status === "CANCELED" || status === "UNDETERMINED") throw new Error(`Transaction ended with status ${status}.`);
      await new Promise((resolve) => window.setTimeout(resolve, 3000));
    }
    throw new Error("Finalization is taking longer than expected. Keep the hash and do not submit the same action again yet.");
  }, []);

  const writeContract = useCallback(async (label: string, functionName: string, args: CalldataEncodable[]) => {
    setPendingAction(label);
    setLastTx({ label, status: "PREPARING", hash: "" });
    try {
      const wallet = account || await connectWallet();
      if (!window.ethereum) throw new Error("Wallet provider unavailable.");
      const client = createClient({ chain, account: wallet as `0x${string}`, provider: window.ethereum as never });
      const hash = await client.writeContract({ address: CONTRACT_ADDRESS, functionName, args, value: 0n, leaderOnly: false });
      setLastTx({ label, status: "SUBMITTED", hash });
      toast.info("Transaction submitted", { description: compact(hash) });
      await waitForFinal(hash);
      setLastTx({ label, status: "FINALIZED", hash });
      toast.success(`${label} finalized`, { description: compact(hash) });
      return hash;
    } catch (error) {
      setLastTx((current) => ({ label, status: "STOPPED", hash: current?.hash ?? "" }));
      toast.error(`${label} stopped`, { description: errorMessage(error) });
      throw error;
    } finally {
      setPendingAction("");
    }
  }, [account, connectWallet, waitForFinal]);

  const loadPosition = useCallback(async (override?: string, silent = false) => {
    let id: string;
    try { id = cleanPositionId(override ?? positionId); }
    catch (error) {
      if (!silent) toast.error("Invalid position ID", { description: errorMessage(error) });
      throw error;
    }
    setLoadingRecord(true);
    try {
      const position = (await readClient.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_position",
        args: [id],
        transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
      })) as Position;
      if (!position.position_id) throw new Error("No position exists for this ID on the StandWord contract.");
      const pageSize = Math.min(limits?.max_page_size ?? 50, 50);
      const [followups, reliances, ownReliance] = await Promise.all([
        readClient.readContract({ address: CONTRACT_ADDRESS, functionName: "get_followups", args: [id, 0, pageSize], transactionHashVariant: TransactionHashVariant.LATEST_FINAL }) as Promise<Followup[]>,
        readClient.readContract({ address: CONTRACT_ADDRESS, functionName: "get_reliances", args: [id, 0, pageSize], transactionHashVariant: TransactionHashVariant.LATEST_FINAL }) as Promise<Reliance[]>,
        account
          ? readClient.readContract({ address: CONTRACT_ADDRESS, functionName: "get_reliance", args: [id, account], transactionHashVariant: TransactionHashVariant.LATEST_FINAL }) as Promise<Reliance>
          : Promise.resolve({} as Reliance),
      ]);
      const next = { position, followups, reliances, ownReliance: ownReliance.wallet ? ownReliance : null };
      setPositionId(id);
      setRecord(next);
      if (!silent) toast.success("Position loaded", { description: compact(id, 9, 7) });
      return next;
    } catch (error) {
      setRecord(null);
      if (!silent) toast.error("Position could not be loaded", { description: errorMessage(error) });
      throw error;
    } finally {
      setLoadingRecord(false);
    }
  }, [account, limits, positionId]);

  const openPosition = async () => {
    try {
      const wallet = account || await connectWallet();
      const cleanTopic = topic.trim();
      const cleanText = positionText.trim();
      if (!cleanTopic || !cleanText) throw new Error("Topic and position text are required.");
      const id = derivePositionId(wallet, cleanTopic);
      await writeContract("Open position", "open_position", [cleanTopic, cleanText]);
      setPositionId(id);
      await loadPosition(id, true);
    } catch (error) {
      if (!pendingAction) toast.error("Position was not opened", { description: errorMessage(error) });
    }
  };

  const submitFollowup = async () => {
    try {
      const id = cleanPositionId(positionId);
      if (!followupText.trim()) throw new Error("Enter the later statement to evaluate.");
      await writeContract("Submit follow-up", "submit_followup", [id, followupText.trim()]);
      setFollowupText("");
      await loadPosition(id, true);
    } catch (error) {
      if (!pendingAction) toast.error("Follow-up was not submitted", { description: errorMessage(error) });
    }
  };

  const registerReliance = async () => {
    try {
      const id = cleanPositionId(positionId);
      if (!relierLabel.trim()) throw new Error("Enter a short label describing this reliance.");
      await writeContract("Register reliance", "register_reliance", [id, relierLabel.trim()]);
      await loadPosition(id, true);
    } catch (error) {
      if (!pendingAction) toast.error("Reliance was not registered", { description: errorMessage(error) });
    }
  };

  const withdrawReliance = async () => {
    try {
      const id = cleanPositionId(positionId);
      await writeContract("Withdraw reliance", "withdraw_reliance", [id]);
      await loadPosition(id, true);
    } catch (error) {
      if (!pendingAction) toast.error("Reliance was not withdrawn", { description: errorMessage(error) });
    }
  };

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Parameters<ModelContext["registerTool"]>[0]) => void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined);
    register({
      name: "inspect_standword_position",
      title: "Inspect StandWord position",
      description: "Load one finalized position with its follow-ups and registered reliances.",
      inputSchema: { type: "object", properties: { positionId: { type: "string", pattern: "^(0x)?[0-9a-fA-F]{64}$" } }, required: ["positionId"], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input) { return loadPosition(String((input as { positionId?: unknown }).positionId ?? "")); },
    });
    register({
      name: "stage_standword_position",
      title: "Stage StandWord position",
      description: "Fill the new-position form for user review without submitting a transaction.",
      inputSchema: { type: "object", properties: { topic: { type: "string", minLength: 1 }, positionText: { type: "string", minLength: 1 } }, required: ["topic", "positionText"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input) {
        const value = input as { topic?: unknown; positionText?: unknown };
        if (typeof value.topic !== "string" || typeof value.positionText !== "string") throw new Error("Topic and positionText are required");
        setTopic(value.topic); setPositionText(value.positionText);
        return { staged: true, submitted: false };
      },
    });
    register({
      name: "stage_standword_followup",
      title: "Stage StandWord follow-up",
      description: "Fill a later statement for user review without submitting a transaction.",
      inputSchema: { type: "object", properties: { positionId: { type: "string" }, followupText: { type: "string", minLength: 1 } }, required: ["positionId", "followupText"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input) {
        const value = input as { positionId?: unknown; followupText?: unknown };
        setPositionId(cleanPositionId(String(value.positionId ?? "")));
        if (typeof value.followupText !== "string" || !value.followupText.trim()) throw new Error("followupText is required");
        setFollowupText(value.followupText); setActiveTab("followup");
        return { staged: true, submitted: false };
      },
    });
    return () => lifecycle.abort();
  }, [loadPosition]);

  const positionIsOwned = Boolean(record && account && sameAddress(record.position.creator, account));
  const canWithdraw = Boolean(record?.ownReliance?.active && record.position.state === "WALKED_BACK");
  const counters = record ? [
    ["Follow-ups", record.position.followup_count, `${record.position.model_calls} model calls`],
    ["Reliances", record.position.reliance_count, `${record.position.standing_reliance_count} active`],
    ["Author", compact(record.position.creator), positionIsOwned ? "connected wallet" : "different wallet"],
  ] : [];

  return (
    <div className="standword-shell">
      <Toaster position="top-right" richColors />

      <header className="topbar">
        <a className="brand" href="#workspace" aria-label="StandWord home">
          <span className="brand-mark"><CornerDownLeft /></span>
          <span><strong>StandWord</strong><small>POSITION · SCOPE · CONSEQUENCE</small></span>
        </a>
        <div className="contract-meta">
          <span><i /> STUDIO<span>NET</span></span>
          <span>CHAIN 61999</span>
          <a href={EXPLORER_URL} target="_blank" rel="noreferrer">{compact(CONTRACT_ADDRESS)} <ArrowUpRight /></a>
        </div>
        <Button className="wallet-button" onClick={() => void connectWallet().catch((error) => toast.error("Wallet not connected", { description: errorMessage(error) }))}>
          <Wallet /> {account ? compact(account) : "Connect wallet"}
        </Button>
      </header>

      {lastTx ? (
        <div className={`tx-strip ${lastTx.status === "STOPPED" ? "tx-error" : ""}`} aria-live="polite">
          <span>{pendingAction ? <LoaderCircle className="spin" /> : lastTx.status === "FINALIZED" ? <Check /> : <AlertTriangle />}</span>
          <strong>{lastTx.label}</strong>
          <em>{lastTx.status}</em>
          {lastTx.hash ? <a href={`https://explorer-studio.genlayer.com/tx/${lastTx.hash}`} target="_blank" rel="noreferrer">{compact(lastTx.hash, 9, 7)} <ExternalLink /></a> : <span className="tx-wait">Preparing wallet request…</span>}
        </div>
      ) : null}

      <main id="workspace" className="page-frame">
        <section className="intro-line">
          <div><span>LIVE WORKSPACE</span><h1>Make the later word answer to the first.</h1></div>
          <p>Record a position, let others rely on it, then use GenLayer consensus to decide whether a later statement reaches fewer occasions. A walkback is permanent.</p>
        </section>

        <section className="workspace-grid">
          <article className="workspace-card compose-card">
            <div className="card-heading"><span>01</span><div><small>AUTHOR</small><h2>Open a position</h2></div><PenLine /></div>
            <Field label="Topic" hint={`${topic.length}/${limits?.max_topic_length ?? 120}`}>
              <Input value={topic} maxLength={limits?.max_topic_length ?? 120} onChange={(event) => setTopic(event.target.value)} placeholder="What is this position about?" />
            </Field>
            <Field label="Position text" hint={`${positionText.length}/${limits?.max_position_text_length ?? 600}`}>
              <Textarea value={positionText} maxLength={limits?.max_position_text_length ?? 600} onChange={(event) => setPositionText(event.target.value)} placeholder="State the coverage you are willing to stand behind." />
            </Field>
            <div className="derived-id">
              <span><Fingerprint /> Predicted position ID</span>
              <code>{derivedId || "Connect a wallet to derive the author-scoped ID"}</code>
            </div>
            <Button className="primary-action" disabled={Boolean(pendingAction)} onClick={() => void openPosition()}>{pendingAction === "Open position" ? <LoaderCircle className="spin" /> : <BookOpenCheck />} Open immutable position</Button>
          </article>

          <article className="workspace-card inspect-card">
            <div className="card-heading"><span>02</span><div><small>ANYONE</small><h2>Inspect a record</h2></div><Search /></div>
            <Field label="Position ID" hint="64 HEX">
              <Input value={positionId} onChange={(event) => setPositionId(event.target.value)} placeholder="Paste the position ID returned by StandWord" />
            </Field>
            <div className="inspect-actions">
              <Button className="secondary-action" disabled={loadingRecord} onClick={() => void loadPosition()}>{loadingRecord ? <LoaderCircle className="spin" /> : <Search />} Load position</Button>
              {record ? <Button className="icon-action" aria-label="Refresh loaded position" disabled={loadingRecord} onClick={() => void loadPosition(record.position.position_id, true)}><RefreshCw /></Button> : null}
            </div>
            {record ? (
              <div className="record-summary">
                <div><StateBadge state={record.position.state} /><span>#{compact(record.position.position_id, 9, 7)}</span></div>
                <h3>{record.position.topic}</h3>
                <p>{record.position.position_text}</p>
                <footer><CopyButton value={record.position.position_id} label="Position ID" /><span>By {compact(record.position.creator)}</span></footer>
              </div>
            ) : (
              <div className="inspect-empty"><GitCompareArrows /><p>A position links the original statement, every later statement, and every reliance record under one immutable ID.</p></div>
            )}
          </article>

          <article className="workspace-card action-card">
            <div className="action-tabs" role="tablist" aria-label="Position actions">
              <button className={activeTab === "followup" ? "active" : ""} onClick={() => setActiveTab("followup")}><History /> Follow-up</button>
              <button className={activeTab === "reliance" ? "active" : ""} onClick={() => setActiveTab("reliance")}><Users /> Reliance</button>
            </div>
            {activeTab === "followup" ? (
              <div className="action-content">
                <small>AUTHOR ONLY</small><h2>Submit the later word</h2>
                <p>Consensus asks whether this statement reaches fewer occasions than the position already on-chain.</p>
                <Field label="Later statement" hint={`${followupText.length}/${limits?.max_followup_text_length ?? 600}`}>
                  <Textarea value={followupText} maxLength={limits?.max_followup_text_length ?? 600} onChange={(event) => setFollowupText(event.target.value)} placeholder="Write the later statement exactly as it should be judged." />
                </Field>
                <Button className="primary-action" disabled={Boolean(pendingAction) || record?.position.state === "WALKED_BACK"} onClick={() => void submitFollowup()}>{pendingAction === "Submit follow-up" ? <LoaderCircle className="spin" /> : <GitCompareArrows />} Request semantic verdict</Button>
                {record && !positionIsOwned ? <div className="inline-note warning"><AlertTriangle /> Connected wallet is not this position&apos;s author.</div> : null}
              </div>
            ) : (
              <div className="action-content">
                <small>PERMISSIONLESS</small><h2>Register reliance</h2>
                <p>Attach the connected wallet to a standing position. Withdrawal unlocks only if that position is later walked back.</p>
                <Field label="Reliance label" hint={`${relierLabel.length}/${limits?.max_relier_label_length ?? 80}`}>
                  <Input value={relierLabel} maxLength={limits?.max_relier_label_length ?? 80} onChange={(event) => setRelierLabel(event.target.value)} placeholder="Why this wallet relies on the position" />
                </Field>
                <div className="reliance-buttons">
                  <Button className="primary-action" disabled={Boolean(pendingAction) || record?.position.state === "WALKED_BACK" || Boolean(record?.ownReliance)} onClick={() => void registerReliance()}>{pendingAction === "Register reliance" ? <LoaderCircle className="spin" /> : <LockKeyhole />} Register reliance</Button>
                  <Button className="withdraw-action" disabled={Boolean(pendingAction) || !canWithdraw} onClick={() => void withdrawReliance()}>{pendingAction === "Withdraw reliance" ? <LoaderCircle className="spin" /> : <Undo2 />} Withdraw</Button>
                </div>
                {record?.ownReliance ? <div className={`inline-note ${record.ownReliance.active ? "good" : "muted"}`}><ShieldCheck /> Your reliance is {record.ownReliance.active ? "active" : "withdrawn"}: {record.ownReliance.label}</div> : null}
              </div>
            )}
          </article>
        </section>

        {record ? (
          <section className="ledger-section">
            <header className="section-heading"><div><span>POSITION LEDGER</span><h2>{record.position.topic}</h2></div><StateBadge state={record.position.state} /></header>
            <div className="counter-grid">
              {counters.map(([label, value, detail]) => <article key={String(label)}><small>{label}</small><strong>{value}</strong><span>{detail}</span></article>)}
            </div>
            {record.position.walked_back_followup_id ? <div className="walkback-line"><Undo2 /><span><strong>Walkback trigger</strong><code>{record.position.walked_back_followup_id}</code></span><CopyButton value={record.position.walked_back_followup_id} label="Follow-up ID" /></div> : null}

            <div className="ledger-grid">
              <div className="ledger-column">
                <div className="column-heading"><span><History /> Follow-up history</span><small>{record.followups.length} loaded</small></div>
                {record.followups.length ? record.followups.map((item) => (
                  <article className="followup-record" key={item.followup_id}>
                    <header><span>#{item.index}</span><em className={item.outcome === "NARROWS_PRIOR" ? "narrows" : "keeps"}>{item.outcome}</em></header>
                    <p>{item.text}</p>
                    <footer><code>{compact(item.followup_id, 10, 8)}</code><CopyButton value={item.followup_id} label="ID" /></footer>
                  </article>
                )) : <div className="list-empty"><History /><span>No later statements have been recorded.</span></div>}
              </div>

              <div className="ledger-column">
                <div className="column-heading"><span><Users /> Reliance registry</span><small>{record.reliances.length} loaded</small></div>
                {record.reliances.length ? record.reliances.map((item) => (
                  <article className="reliance-record" key={item.wallet}>
                    <span className={item.active ? "active-reliance" : "withdrawn-reliance"}>{item.active ? "ACTIVE" : "WITHDRAWN"}</span>
                    <div><strong>{item.label}</strong><code>{item.wallet}</code></div>
                    <span>#{item.index ?? "—"}</span>
                  </article>
                )) : <div className="list-empty"><Users /><span>No wallet has registered reliance yet.</span></div>}
              </div>
            </div>
          </section>
        ) : (
          <section className="principle-grid">
            <article><span>01</span><LockKeyhole /><h3>The first word stays fixed</h3><p>Topic, text, author and ordering are stored under an author-scoped position ID.</p></article>
            <article><span>02</span><GitCompareArrows /><h3>Scope needs semantic judgment</h3><p>The verdict is about covered occasions, not keywords or general similarity.</p></article>
            <article><span>03</span><Undo2 /><h3>A walkback has teeth</h3><p>Later follow-ups close and registered reliers gain a one-time withdrawal path.</p></article>
          </section>
        )}
      </main>

      <footer className="footer">
        <span><ShieldCheck /> Exact verified source · {SOURCE_SHA.slice(0, 12)}…</span>
        <span>Deploy tx · {compact(DEPLOY_TX, 10, 8)}</span>
        <a href={EXPLORER_URL} target="_blank" rel="noreferrer">Open contract explorer <ExternalLink /></a>
      </footer>
    </div>
  );
}
