# Stage 1: Build Stage
FROM python:3.9.19-slim-bullseye as build

# Install build tools/dependencies from apt
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    golang \
    ruby \
    ruby-dev \
    bundler \
    curl \
    gnupg \
    unzip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set up environment variables
ENV GOPATH="/go"
ENV PATH="$GOPATH/bin:$PATH"

# Install WhatWeb
RUN gem install rchardet mongo json \
    && git clone https://github.com/urbanadventurer/WhatWeb /tools/WhatWeb \
    && cd /tools/WhatWeb && bundle install

# Install RetireJS
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - \
    && echo 'deb https://dl.yarnpkg.com/debian/ stable main' > /etc/apt/sources.list.d/yarn.list \
    && apt-get update \
    && apt-get install -y yarn nodejs \
    && npm install -g retire

# Install Wappalyzer
RUN git clone https://github.com/dochne/wappalyzer.git /tools/wappalyzer \
    && cd /tools/wappalyzer && yarn install

# Install Nuclei
RUN wget https://github.com/projectdiscovery/nuclei/releases/download/v2.6.5/nuclei_2.6.5_linux_amd64.zip -O /tmp/nuclei.zip \
    && unzip /tmp/nuclei.zip -d /tools \
    && git clone https://github.com/projectdiscovery/nuclei-templates.git /tools/nuclei-templates

# Install testssl.sh
RUN git clone https://github.com/drwetter/testssl.sh.git /tools/testssl.sh

# Install CMSeeK
RUN git clone https://github.com/Tuhinshubhra/CMSeeK /tools/CMSeeK \
    && cd /tools/CMSeeK && pip install -r requirements.txt && mkdir Results

# Install wafw00f
RUN git clone https://github.com/EnableSecurity/wafw00f /tools/wafw00f \
    && cd /tools/wafw00f && python3 setup.py install

# Stage 2: Final Stage
FROM python:3.9.19-slim-bullseye

# Copy tools from build stage
COPY --from=build /tools /tools

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    nbtscan \
    onesixtyone \
    nmap \
    bsdmainutils \
    dnsutils \
    coreutils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Add spiderfoot user
RUN groupadd spiderfoot && useradd -m -g spiderfoot -d /home/spiderfoot -s /sbin/nologin -c "SpiderFoot User" spiderfoot

# Set up SpiderFoot directories
ENV SPIDERFOOT_DATA /var/lib/spiderfoot
ENV SPIDERFOOT_LOGS /var/lib/spiderfoot/log
ENV SPIDERFOOT_CACHE /var/lib/spiderfoot/cache

RUN mkdir -p $SPIDERFOOT_DATA $SPIDERFOOT_LOGS $SPIDERFOOT_CACHE \
    && chown spiderfoot:spiderfoot $SPIDERFOOT_DATA $SPIDERFOOT_LOGS $SPIDERFOOT_CACHE

# Copy project files and set up virtual environment
WORKDIR /home/spiderfoot
COPY . .
ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv "$VIRTUAL_ENV" \
    && chown -R spiderfoot:spiderfoot /tools "$VIRTUAL_ENV" /home/spiderfoot

USER spiderfoot
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN pip install -U pip \
    && pip install -r requirements.txt

# Install Python tools
RUN pip install dnstwist

# Set ownership
RUN chown -R spiderfoot:spiderfoot /tools "$VIRTUAL_ENV" /home/spiderfoot

EXPOSE 5001

# Run the application
CMD python -c 'from spiderfoot import SpiderFootDb; \
db = SpiderFootDb({"__database": "/var/lib/spiderfoot/spiderfoot.db"}); \
db.configSet({ \
    "sfp_tool_dnstwist:dnstwistpath": "/opt/venv/bin/dnstwist", \
    "sfp_tool_cmseek:cmseekpath": "/tools/CMSeeK/cmseek.py", \
    "sfp_tool_whatweb:whatweb_path": "/tools/WhatWeb/whatweb", \
    "sfp_tool_wafw00f:wafw00f_path": "/opt/venv/bin/wafw00f", \
    "sfp_tool_onesixtyone:onesixtyone_path": "/usr/bin/onesixtyone", \
    "sfp_tool_retirejs:retirejs_path": "/usr/bin/retire", \
    "sfp_tool_testsslsh:testsslsh_path": "/tools/testssl.sh/testssl.sh", \
    "sfp_tool_snallygaster:snallygaster_path": "/usr/local/bin/snallygaster", \
    "sfp_tool_trufflehog:trufflehog_path": "/usr/local/bin/trufflehog", \
    "sfp_tool_nuclei:nuclei_path": "/tools/nuclei", \
    "sfp_tool_nuclei:template_path": "/tools/nuclei-templates", \
    "sfp_tool_wappalyzer:wappalyzer_path": "/tools/wappalyzer/src/drivers/npm/cli.js", \
    "sfp_tool_nbtscan:nbtscan_path": "/usr/bin/nbtscan", \
    "sfp_tool_nmap:nmappath": "DISABLED_BECAUSE_NMAP_REQUIRES_ROOT_TO_WORK" \
})' || true && python ./sf.py -l 0.0.0.0:5001