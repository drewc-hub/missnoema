"use client";
import AccountPill from "@/components/account-pill";
import React from "react";
import { Button } from "@/components/ui";
import Link from "next/link";

function NavLink({ href, label }: { href: string; label: string }) {


export default function NavBar() {
  return (
    <nav className="nav">
      <div className="navLeft">
        <div className="logo">Noema</div>
      </div>

      <div className="navCenter">
        <Link href="/landing">Home</Link>
        <Link href="/library">Library</Link>
        <Link href="/create">Create</Link>
        <Link href="/generate">Generate</Link>
        <Link href="/mission">Mission</Link>
        <Link href="/pricing">Pricing</Link>
        <link href="/login">Login</Link>
      </div>

      <div className="navRight">
        <Link href="/subscribe" className="primaryBtn">
          Subscribe
        </Link>
      </div>
    </nav>
  );
}
