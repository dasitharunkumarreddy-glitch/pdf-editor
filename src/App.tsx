import { usePdfStore } from './store/pdfStore';
import { Home } from './pages/Home';
import { Editor } from './pages/Editor';

function App() {
  const { file } = usePdfStore();

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-950 transition-colors duration-250">
      {file ? <Editor /> : <Home />}
    </div>
  );
}

export default App;
