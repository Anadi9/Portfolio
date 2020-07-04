import React from 'react';
import { Navbar, } from 'react-bootstrap';
import { withRouter } from 'react-router-dom';

function NavBar(props) {
    return (
      <Navbar bg="black" variant="dark" expand="lg">
      <Navbar.Brand className="mx-auto" onClick={() => props.history.push('/')}>Portfolio</Navbar.Brand>
    </Navbar>
    );
}

export default withRouter(NavBar);