import React from 'react';
import { Link, NavLink } from 'react-router-dom';

function Navbar(props) {
    return (
        <nav className="navbar navbar-expand bg-black sticky-top">
        <Link className="navbar-brand text-white" to="/">
        <h5>Portfolio</h5>
          </Link>
           <NavLink className="nav-item nav-link text-white" to="/About">About</NavLink>
           <NavLink className="nav-item nav-link text-white" to="/Education">Education</NavLink>
           <NavLink className="nav-item nav-link text-white" to="/Skills">Skills</NavLink>
           <NavLink className="nav-item nav-link text-white" to="/More">More</NavLink>
        </nav>
    );
}

export default Navbar;