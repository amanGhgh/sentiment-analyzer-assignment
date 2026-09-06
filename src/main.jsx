import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import './styles.css';
import './tweaks.css';

const demo = `Customer: Hi, my internet has not been working since yesterday and I am frustrated.
Agent: I am sorry about that. I can see an outage in your area and will create a priority ticket.
Customer: Thank you. I need it fixed today because I work from home.
Agent: The engineer is scheduled for this afternoon. I will send you an update by 4 PM.
Customer: Great, I appreciate the quick help.`;

const colors = { Positive: '#42d3a2', Neutral: '#90a3bd', Negative: '#ff667a' };

function Login({ onLogin }) {
  const [email, setEmail] = useState('student@demo.com');
  function submit(event) { event.preventDefault(); onLogin(); }

  return (
    <main className="login">
      <section>
        <p className="eyebrow">CONVERSATION ANALYSIS</p>
        <h1>Understand every customer conversation.</h1>
        <p>Upload a call transcript to reveal sentiment and practical follow-up insights.</p>
      </section>
      <form onSubmit={submit}>
        <h2>Welcome back</h2>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></label>
        <label>Password<input type="password" defaultValue="password" required /></label>
        <button>Enter dashboard</button>
        <small>Local demo login for this assignment</small>
      </form>
    </main>
  );
}

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [transcript, setTranscript] = useState('');

  async function run(text) {
    setLoading(true); setError('');
    try {
      const response = await fetch('https://sentiment-analyzer-assignment.onrender.com/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text })
});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis failed.');
      setResult(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.txt')) { setError('Please choose a .txt transcript.'); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => run(reader.result);
    reader.onerror = () => setError('The file could not be read.');
    reader.readAsText(file);
  }

  function analyzeTypedText() {
    if (transcript.trim().length < 5) {
      setError('Please enter a longer conversation before analyzing.');
      return;
    }
    setFileName('Typed conversation');
    run(transcript);
  }

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;
  const chartData = result ? Object.entries(result.sentimentBreakdown).map(([name, value]) => ({ name: name[0].toUpperCase() + name.slice(1), value })) : [];

  return (
    <main className="app">
      <header>
        <div><p className="eyebrow">CALLSENSE</p><h1>Sentiment Analyzer</h1></div>
        <button className="secondary" onClick={() => setLoggedIn(false)}>Sign out</button>
      </header>
      <section className="upload">
        <div><h2>Analyze a conversation</h2><p>Paste or type a transcript, or upload a `.txt` file. Lines may begin with “Customer:” or “Agent:”.</p></div>
        <textarea className="transcript-input" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder={'Customer: My internet is not working.\nAgent: I will check this for you.'} aria-label="Conversation text" />
        <div className="actions"><button onClick={analyzeTypedText}>Analyze text</button><label className="file"><input type="file" accept=".txt,text/plain" onChange={upload} />Upload .txt</label><button className="secondary" onClick={() => { setTranscript(demo); setFileName('demo-call.txt'); run(demo); }}>Use demo call</button></div>
        {fileName && <small>Analyzing: {fileName}</small>}
        {error && <p className="error">{error}</p>}
      </section>
      {loading && <section className="loading">Analyzing the conversation…</section>}
      {result && <Results result={result} chartData={chartData} />}
    </main>
  );
}

function Results({ result, chartData }) {
  return <>
    <section className="headline">
      <div><p className="eyebrow">OVERALL SENTIMENT</p><h2 className={result.overallSentiment.toLowerCase()}>{result.overallSentiment}</h2><p>Sentiment score: {result.sentimentScore}</p><small className={result.source.includes('fallback') ? 'fallback' : ''}>{result.source}</small></div>
      <article><h3>Conversation summary</h3><p>{result.conversationSummary}</p></article>
    </section>
    <section className="grid kpis">
      <article><p>Primary emotion</p><h3>{result.primaryEmotion}</h3></article>
      <article><p>Primary issue</p><h3>{result.primaryIssue}</h3></article>
      <article><p>Resolution status</p><h3>{result.resolutionStatus}</h3></article>
    </section>
    <section className="dashboard">
      <article className="chart">
        <h2>Sentiment breakdown</h2>
        <ResponsiveContainer width="100%" height={230}>
          <PieChart><Pie data={chartData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={3}>{chartData.map((item) => <Cell key={item.name} fill={colors[item.name]} />)}</Pie><Tooltip /></PieChart>
        </ResponsiveContainer>
        <div className="legend">{chartData.map((item) => <span key={item.name}><i style={{ background: colors[item.name] }} />{item.name}: {item.value}</span>)}</div>
        <h3>Key insights</h3><ul>{result.keyInsights.map((insight) => <li key={insight}>{insight}</li>)}</ul>
      </article>
      <article><h2>Sentence-level analysis</h2><div className="sentences">{result.sentenceAnalysis.map((item, index) => <div className="sentence" key={index}><span className="speaker">{item.speaker}</span><p>{item.sentence}</p><span className={`tag ${item.sentiment.toLowerCase()}`}>{item.sentiment}</span><span className="emotion">{item.emotion}</span></div>)}</div></article>
    </section>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
