Cme-api
==============

Core monitoring engine (CME) API package.  This package is used to provide the http-based API layer
for the CME system.

Runs under Python version: 3.5+.

You can use the package stand-alone after installation, or you can run it as a deployed
package on end-use CME hardware.  Instructions for both are below.

Look in `requirements.txt` to find the dependent packages. 

Stand-Alone Development
-----------------------

**Prerequisites**

* Python 3.5+

Clone the Cme-api project repository to a development machine.  Generally this package should run
on nearly any machine with Python 3.5 installed.  Note that you
must either add an SSH public key to your GitLab profile from the development machine, or copy an
existing SSH public key to the development machine in order to use `git` to clone the project.

```bash
root@cme-dev[~:501] $ git clone git@10.252.64.224:Avalanche/Cme.git
```

Create a virtual environment for the package.  Generally you can keep this within the
same folder as the top-level project.   

```bash
root@cme-dev[~/Cme:502] $ virtualenv cme_venv
```

Activate the virtual environment.

```bash
root@cme-dev[~/Cme:503] $ source cme_venv/bin/activate
```

Install the dependent packages.

```bash
(cme_venv)root@cme-dev[~/Cme:504] $ pip install -r requirements.txt
```

Run the package.

```bash
(cme_venv)root@cme-dev[~/Cme:505] $ python -m cme
```

**Note:** See the docker files in the `build` folder for various docker image options.  The `cme-dev.docker`
can be used to generate an Alpine Linux based container for Cme development.

Runtime Use
---------------

__coming soon__ ...