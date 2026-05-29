import React, { useEffect, useState } from "react";
import { assets, nav_links } from "../assets/assets";
import { useAppContext } from "../context/AppContext";
import { useClerk, UserButton, useUser } from "@clerk/react";
import { Menu, TicketPlus, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
    const { navigate, token } = useAppContext();
    const { user } = useUser();
    const { openSignIn } = useClerk();
    const { pathname } = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        document.body.style.overflow = mobileOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileOpen]);

    const isActive = (href) => {
        if (href === "/") return pathname === "/";
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    const linkClass = (href) =>
        `text-sm font-medium transition-colors duration-150 ${
            isActive(href)
                ? "text-primary"
                : "text-gray-600 hover:text-gray-900"
        }`;

    const AuthControl = ({ className = "" }) =>
        !user ? (
            <button
                type="button"
                onClick={openSignIn}
                className={`inline-flex items-center justify-center gap-2 rounded-full bg-primary text-white text-sm font-medium px-6 py-2.5 hover:bg-primary-hover transition-colors cursor-pointer ${className}`}
            >
                {token ? "Dashboard" : "Login"}
                <img src={assets.arrow} className="w-3" alt="" />
            </button>
        ) : (
            <UserButton>
                <UserButton.MenuItems>
                    <UserButton.Action
                        label="My Blogs"
                        labelIcon={<TicketPlus width={15} />}
                        onClick={() => navigate("/my-blogs")}
                    />
                </UserButton.MenuItems>
            </UserButton>
        );

    return (
        <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
            <nav
                className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
                aria-label="Main navigation"
            >
                <Link to="/" className="shrink-0" onClick={() => setMobileOpen(false)}>
                    <img
                        src={assets.logo}
                        alt="Blogify ML"
                        className="h-8 w-auto sm:h-9 cursor-pointer"
                    />
                </Link>

                <ul className="hidden md:flex items-center gap-6 lg:gap-8">
                    {nav_links.map((link) => (
                        <li key={link.href}>
                            <Link to={link.href} className={linkClass(link.href)}>
                                {link.label}
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className="hidden md:flex items-center gap-3 shrink-0">
                    <AuthControl />
                </div>

                <button
                    type="button"
                    className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-expanded={mobileOpen}
                    aria-controls="mobile-nav"
                    aria-label={mobileOpen ? "Close menu" : "Open menu"}
                    onClick={() => setMobileOpen((open) => !open)}
                >
                    {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </nav>

            {mobileOpen && (
                <button
                    type="button"
                    className="fixed inset-0 top-16 z-40 bg-black/30 md:hidden"
                    aria-label="Close menu overlay"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <div
                id="mobile-nav"
                className={`md:hidden overflow-hidden border-t border-gray-100 bg-white transition-all duration-300 ease-out ${
                    mobileOpen ? "max-h-[28rem] opacity-100" : "max-h-0 opacity-0 border-transparent"
                }`}
            >
                <ul className="flex flex-col gap-1 px-4 py-4 sm:px-6">
                    {nav_links.map((link) => (
                        <li key={link.href}>
                            <Link
                                to={link.href}
                                className={`block rounded-lg px-3 py-2.5 ${linkClass(link.href)} ${
                                    isActive(link.href) ? "bg-primary/5" : "hover:bg-gray-50"
                                }`}
                            >
                                {link.label}
                            </Link>
                        </li>
                    ))}
                    <li className="pt-3 mt-2 border-t border-gray-100">
                        <div className="flex justify-center py-2">
                            <AuthControl className="w-full max-w-xs" />
                        </div>
                    </li>
                </ul>
            </div>
        </header>
    );
};

export default Navbar;
