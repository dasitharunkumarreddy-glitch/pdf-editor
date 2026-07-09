import { Suspense, lazy } from 'react';
import { usePdfStore } from './store/pdfStore';
import { Home } from './pages/Home';

const Editor = lazy(() =>
  import('./pages/Editor').then((module) => ({ default: module.Editor })),
);

function App() {
  const { file } = usePdfStore();

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-950 transition-colors duration-250">
      {file ? (
        <Suspense
          fallback={
            <div className="flex-1 grid place-items-center text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              Loading editor...
            </div>
          }
        >
          <Editor />
        </Suspense>
      ) : (
        <Home />
      )}
    </div>
  );
}

export default App;
