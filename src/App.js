import React, { useState, useEffect} from "react";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:8000";

const fetchPapers = async () => {
  const response = await fetch(`${API_BASE_URL}/fetch_recent_papers`);
  if (!response.ok) {
    throw new Error("Failed to fetch papers");
  }
  return response.json();
};

const addPaperToNotion = async (title, url) => {
  const response = await fetch(`${API_BASE_URL}/add_to_notion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, url }),
  });

  if (!response.ok) {
    throw new Error("Failed to add paper to Notion");
  }
};

const getBackgroundColorForRelevance = (score) => {
  if (score >= 0.6) return "rgba(0, 255, 0, 0.7)"; 
  if (score >= 0.5) return "rgba(255, 165, 0, 0.7)"; 
  return "rgba(255, 0, 0, 0.7)"; 
};

// 論文コンポーネント
const Paper = ({ title, url, summary, relevance, onAddToNotion, onStatusChange }) => {
  console.log(relevance)
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState("pending");

  const MAX_LENGTH = 250;
  const displayText = isExpanded
    ? summary
    : `${summary.slice(0, MAX_LENGTH)}${summary.length > MAX_LENGTH ? "..." : ""}`;

  const handleAddClick = () => {
    onAddToNotion(title, url);
    setStatus("added");
    onStatusChange("added");
  };

  const handleIgnoreClick = () => {
    setStatus("ignored");
    onStatusChange("ignored");
  };

  return (
    <div className="paper-container">
      <div className="paper-content">
        <h3><a href={url}>{title}</a></h3>
        <p>
          {displayText}
          {summary.length > MAX_LENGTH && (
            <button
              className="paper-summary-toggle"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Hide" : "Show More"}
            </button>
          )}
        </p>
        <p
          className="relevance-score"
          style={{ backgroundColor: getBackgroundColorForRelevance(relevance) }}
        >
          Relevance: {relevance.toFixed(2)}
        </p>
      </div>
      <div className="paper-buttons">
        <p>Status: {status}</p>
        <button
          className="paper-button add"
          onClick={handleAddClick}
          disabled={status !== "pending"}
        >
          Add
        </button>
        <button
          className="paper-button ignore"
          onClick={handleIgnoreClick}
          disabled={status !== "pending"}
        >
          Ignore
        </button>
      </div>
    </div>
  );
};

const App = () => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ added: 0, ignored: 0 });

  useEffect(() => {
    const loadPapers = async () => {
      try {
        const data = await fetchPapers();
        setPapers(data.papers || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadPapers();
  }, []);

  const handleStatusChange = (status) => {
    setStats((prevStats) => ({
      ...prevStats,
      [status]: prevStats[status] + 1,
    }));
  };

  const handleAddToNotion = async (title, url) => {
    try {
      await addPaperToNotion(title, url);
      alert("Paper added to Notion!");
    } catch (err) {
      console.error(err);
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const pendingCount = papers.length - stats.added - stats.ignored;

  return (
    <div>
      <h1>Recent cs.CV Papers Published on arXiv</h1>
      <p>Added: {stats.added}, Ignored: {stats.ignored}, Pending: {pendingCount}</p>
      {papers.map((paper, index) => (
        <Paper
          key={index}
          title={paper.title}
          url={paper.url}
          summary={paper.summary}
          relevance={paper.relevance}
          onAddToNotion={handleAddToNotion}
          onStatusChange={handleStatusChange}
        />
      ))}
    </div>
  );
};

export default App;
