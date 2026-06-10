const Footer = () => {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-primary/10 bg-gradient-to-b from-primary/[0.04] to-transparent">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col items-center justify-center">
                    <span
                        className="mb-1.5 h-px w-10 rounded-full bg-primary/40"
                        aria-hidden="true"
                    />
                    <p className="text-center text-xs sm:text-sm text-gray-500 tracking-wide">
                        Copyright {year} &copy; <span className="font-medium text-gray-600">Blogify</span>.
                        All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
