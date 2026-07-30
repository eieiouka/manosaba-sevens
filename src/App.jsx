import "./App.css";
import SevensGame from "./sevens/SevensGame";

function App() {
  const navigate = (path) => {
    window.location.href = path;
  };

  return <SevensGame navigate={navigate} />;
}

export default App;