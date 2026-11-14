import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TaskItem } from '../components/TaskItem';
import { BackButton, EmptyNote, SearchBox, Skeleton } from '../components/ui';
import { useTaskList } from '../hooks/useTasks';

/** Search screen (Figma "Frame 9") */
export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const query = useDebounced(text.trim(), 300);

  // keep ?q= in the URL so coming back from a result restores the search
  useEffect(() => {
    setParams(query ? { q: query } : {}, { replace: true });
  }, [query, setParams]);

  const { data, isFetching, isPending, isError } = useTaskList({ search: query }, query.length > 0);

  return (
    <div className="px-6 pt-8 pb-10">
      <BackButton to="/" />

      <div className="mt-6">
        <SearchBox>
          <input
            autoFocus
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search for a task"
            aria-label="Search tasks by title or description"
            className="h-full min-w-0 flex-1 bg-transparent text-xs font-light text-ink outline-none placeholder:text-black/60 [&::-webkit-search-cancel-button]:hidden"
          />
          {isFetching && query && <Loader2 className="size-4 animate-spin text-label" />}
          {text && (
            <button type="button" aria-label="Clear search" onClick={() => setText('')} className="text-label">
              <X className="size-4" />
            </button>
          )}
        </SearchBox>
      </div>

      <div className="mt-11 space-y-4">
        {!query && <EmptyNote>Search by a word from a task’s title or description.</EmptyNote>}

        {query && isPending && (
          <>
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </>
        )}

        {query && isError && <EmptyNote>Search failed. Please try again.</EmptyNote>}

        {query && data?.length === 0 && <EmptyNote>No tasks match “{query}”.</EmptyNote>}

        {query &&
          data?.map((task) => <TaskItem key={task.id} task={task} onOpen="view" showDay highlight={query} />)}

        {query && !!data?.length && (
          <p className="pt-1 text-center text-[10px] text-faint">Tap a task to view it · swipe left to delete</p>
        )}
      </div>
    </div>
  );
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
