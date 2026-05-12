"use client";
import React from "react";
import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="nav">
      <div className="navLeft">
        <div className="logo">Noema</div>
      </div>

      <div className="navCenter">
        <Link href="/tavern">Home</Link>
        <Link href="/companions">Library</Link>
        <Link href="/companions/new">Create</Link>
        <Link href="/companions/media">Generate</Link>
        <Link href="/about">Mission</Link>
        <Link href="/account/billing">Pricing</Link>
        <Link href="/login">Login</Link>
      </div>

      <div className="navRight">
        <Link href="/account/billing" className="primaryBtn">
          Subscribe
        </Link>
      </div>
    </nav>
  );
}
