export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-[5%] py-8">
        <p className="text-sm text-muted-foreground">
          BSCS Bench &middot; Not affiliated with Rice University
          &middot; Icons by{" "}
          <a
            href="https://www.flaticon.com"
            className="underline hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            Flaticon
          </a>
        </p>
      </div>
    </footer>
  );
}
