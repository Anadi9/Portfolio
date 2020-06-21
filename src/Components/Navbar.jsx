import React from 'react';
import { Link, NavLink } from 'react-router-dom';

function Navbar(props) {
    return (
        <nav className="flex text-center navbar-expand sticky-top">
        <Link className="navbar-brand text-white" to="/">
        <h5>Portfolio</h5>
          </Link>
          <NavLink className="text-white" to="/Contact">Contact</NavLink>
        </nav>
    );
}

export default Navbar;