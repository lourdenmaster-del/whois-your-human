"use client";

export default function EmotionalSnippet({ snippet, subjectName }) {
  if (!snippet && !subjectName) return null;
  return (
    <div className="text-center space-y-2">
      {subjectName && (
        <h1 className="beauty-heading text-2xl sm:text-3xl lg:text-4xl tracking-wide beauty-text-inverse">
          {subjectName}
        </h1>
      )}
      {snippet && (
        <p className="beauty-body text-lg beauty-text-inverse font-normal max-w-2xl mx-auto italic">
          &ldquo;{snippet}&rdquo;
        </p>
      )}
    </div>
  );
}
