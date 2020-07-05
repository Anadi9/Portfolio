import React from 'react';
import { Navbar, } from 'react-bootstrap';
import { animateScroll as scroll } from "react-scroll";


function NavBar(props) {
const scrollToTop = () => {
  scroll.scrollToTop();
};

    return (
      <Navbar className="navbar" variant="dark" expand="lg" fixed="top">
      <Navbar.Brand className="mx-auto" onClick={scrollToTop}>Portfolio</Navbar.Brand>
    </Navbar>
    );
}

export default NavBar;