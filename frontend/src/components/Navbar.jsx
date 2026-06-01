import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
    const mobileNavRef = useRef(null);
    const menuToggleRef = useRef(null);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        document.body.style.overflow = mobileOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileOpen]);

    useEffect(() => {
        if (!mobileOpen) return;

        const isClerkUi = (target) =>
            target instanceof Element &&
            !!target.closest(
                '[class*="cl-"], [data-clerk-portal], .cl-modalBackdrop, .cl-userButtonPopoverCard'
            );

        const handleOutside = (event) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (isClerkUi(target)) return;
            if (mobileNavRef.current?.contains(target)) return;
            if (menuToggleRef.current?.contains(target)) return;
            setMobileOpen(false);
        };

        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("touchstart", handleOutside);

        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("touchstart", handleOutside);
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

    const AuthControl = ({ className = "", mobile = false }) =>
        !user ? (
            <button
                type="button"
                onClick={openSignIn}
                className={`inline-flex items-center gap-2 rounded-full bg-primary text-white text-sm font-medium px-6 py-2.5 hover:bg-primary-hover transition-colors cursor-pointer ${
                    mobile ? "justify-start" : "justify-center"
                } ${className}`}
            >
                {token ? "Dashboard" : "Login"}
                <img src={assets.arrow} className="w-3" alt="" />
            </button>
        ) : (
            <UserButton
                appearance={
                    mobile
                        ? {
                              elements: {
                                  rootBox: "flex justify-start items-center",
                                  avatarBox: "h-9 w-9",
                              },
                          }
                        : undefined
                }
            >
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
        <header className="sticky top-0 z-[110] border-b border-gray-100 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
            <nav
                className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
                aria-label="Main navigation"
            >
                <Link to="/" className="shrink-0" onClick={() => setMobileOpen(false)}>
                    <img
                        src={assets.logo}
                        alt="Blogify-ML"
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
                    ref={menuToggleRef}
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

            {mobileOpen &&
                createPortal(
                    <button
                        type="button"
                        className="fixed inset-0 z-[100] bg-black/25 backdrop-blur-sm md:hidden"
                        aria-label="Close menu overlay"
                        onClick={() => setMobileOpen(false)}
                    />,
                    document.body
                )}

            <div
                ref={mobileNavRef}
                id="mobile-nav"
                aria-hidden={!mobileOpen}
                className={`md:hidden fixed left-0 right-0 top-16 z-[105] max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-white/30 bg-white/75 shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-white/65 transition-[transform,opacity] duration-300 ease-out ${
                    mobileOpen
                        ? "translate-y-0 opacity-100 pointer-events-auto"
                        : "-translate-y-3 opacity-0 pointer-events-none"
                }`}
            >
                <ul className="flex flex-col gap-1 px-4 py-4 sm:px-6">
                    {nav_links.map((link) => (
                        <li key={link.href}>
                            <Link
                                to={link.href}
                                className={`block rounded-lg px-3 py-2.5 backdrop-blur-md transition-colors duration-150 ${linkClass(link.href)} ${
                                    isActive(link.href)
                                        ? "bg-primary/10 border border-primary/10"
                                        : "hover:bg-white/50 border border-transparent"
                                }`}
                            >
                                {link.label}
                            </Link>
                        </li>
                    ))}
                    <li className="pt-2 mt-1 border-t border-gray-200/50">
                        <div className="flex justify-start items-center px-3 py-2.5">
                            <AuthControl mobile />
                        </div>
                    </li>
                </ul>
            </div>
        </header>
    );
};

export default Navbar;
