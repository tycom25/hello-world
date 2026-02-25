/* ── AWS True / False Quiz ────────────────────────────────── */

const questions = [
  // Compute
  {
    category: "Compute",
    text: "Amazon EC2 instances can only run on a single Availability Zone and cannot be moved to another.",
    answer: false,
    explanation: "EC2 instances are tied to a specific AZ, but you can launch new instances in any AZ or use Auto Scaling to distribute across multiple AZs."
  },
  {
    category: "Compute",
    text: "AWS Lambda automatically scales by running code in response to each trigger, with no servers to manage.",
    answer: true,
    explanation: "Lambda is a serverless compute service that automatically provisions and scales the infrastructure needed to run your functions."
  },
  {
    category: "Compute",
    text: "Amazon EC2 Reserved Instances provide up to 75% discount compared to On-Demand pricing.",
    answer: true,
    explanation: "Reserved Instances can save up to 75% versus On-Demand pricing when you commit to a 1- or 3-year term."
  },
  {
    category: "Compute",
    text: "AWS Elastic Beanstalk requires you to manually provision the underlying EC2 instances.",
    answer: false,
    explanation: "Elastic Beanstalk automatically handles capacity provisioning, load balancing, auto-scaling, and application health monitoring."
  },
  {
    category: "Compute",
    text: "Spot Instances can be interrupted by AWS with a 2-minute warning when capacity is needed.",
    answer: true,
    explanation: "Spot Instances use spare EC2 capacity and AWS can reclaim them with a 2-minute interruption notice."
  },

  // Storage
  {
    category: "Storage",
    text: "Amazon S3 stores data in buckets and provides 99.999999999% (11 nines) of data durability.",
    answer: true,
    explanation: "Amazon S3 Standard is designed for 99.999999999% durability by redundantly storing data across multiple devices in multiple facilities."
  },
  {
    category: "Storage",
    text: "Amazon EBS volumes can be attached to multiple EC2 instances simultaneously by default.",
    answer: false,
    explanation: "By default, EBS volumes can only be attached to a single EC2 instance. EBS Multi-Attach is a special feature available only for certain volume types (io1/io2)."
  },
  {
    category: "Storage",
    text: "Amazon S3 objects are globally unique and accessible via a URL that includes the bucket name.",
    answer: true,
    explanation: "S3 bucket names must be globally unique, and every object is accessible via a URL of the form https://bucket-name.s3.amazonaws.com/key."
  },
  {
    category: "Storage",
    text: "Amazon Glacier is designed for frequently accessed data that requires millisecond retrieval times.",
    answer: false,
    explanation: "Amazon S3 Glacier is designed for long-term archival of infrequently accessed data. Retrieval times range from minutes to hours."
  },
  {
    category: "Storage",
    text: "Amazon EFS (Elastic File System) can be mounted by multiple EC2 instances concurrently.",
    answer: true,
    explanation: "Amazon EFS is a fully managed NFS file system that can be mounted concurrently from thousands of EC2 instances across multiple AZs."
  },

  // Databases
  {
    category: "Databases",
    text: "Amazon RDS Multi-AZ deployments automatically replicate data to a standby instance in a different Availability Zone.",
    answer: true,
    explanation: "RDS Multi-AZ synchronously replicates data to a standby instance in a different AZ for high availability and failover support."
  },
  {
    category: "Databases",
    text: "Amazon DynamoDB is a relational database service managed by AWS.",
    answer: false,
    explanation: "DynamoDB is a fully managed NoSQL (key-value and document) database, not a relational database."
  },
  {
    category: "Databases",
    text: "Amazon Aurora is compatible with both MySQL and PostgreSQL.",
    answer: true,
    explanation: "Aurora offers MySQL-compatible and PostgreSQL-compatible editions while delivering up to 5x the performance of MySQL and 3x of PostgreSQL."
  },
  {
    category: "Databases",
    text: "Amazon ElastiCache supports Redis and Memcached as caching engines.",
    answer: true,
    explanation: "ElastiCache is a fully managed in-memory caching service that supports both Redis and Memcached."
  },

  // Networking
  {
    category: "Networking",
    text: "An Amazon VPC is limited to a single AWS Region.",
    answer: true,
    explanation: "A VPC spans all Availability Zones in a single AWS Region. To have resources in multiple regions, you need VPCs in each region."
  },
  {
    category: "Networking",
    text: "A Security Group in AWS acts as a stateless firewall at the instance level.",
    answer: false,
    explanation: "Security Groups are stateful — return traffic is automatically allowed regardless of outbound rules. Network ACLs are stateless."
  },
  {
    category: "Networking",
    text: "Amazon Route 53 is a highly available and scalable DNS web service.",
    answer: true,
    explanation: "Route 53 is AWS's scalable and highly available Domain Name System (DNS) web service, also supporting health checking and traffic routing."
  },
  {
    category: "Networking",
    text: "AWS Direct Connect provides a dedicated network connection from your premises to AWS.",
    answer: true,
    explanation: "Direct Connect establishes a dedicated private network connection between your on-premises network and AWS, bypassing the public internet."
  },
  {
    category: "Networking",
    text: "An Internet Gateway is needed for instances in a private subnet to access the internet.",
    answer: false,
    explanation: "Private subnets use a NAT Gateway (or NAT instance), not an Internet Gateway directly. The Internet Gateway is attached to the VPC and used by public subnets."
  },

  // Security & IAM
  {
    category: "Security & IAM",
    text: "AWS IAM users have full administrator access by default when first created.",
    answer: false,
    explanation: "New IAM users have no permissions by default. You must explicitly grant permissions via policies."
  },
  {
    category: "Security & IAM",
    text: "AWS Shield Standard is automatically enabled for all AWS customers at no extra charge.",
    answer: true,
    explanation: "AWS Shield Standard is automatically available to all AWS customers and protects against common, most frequently occurring DDoS attacks."
  },
  {
    category: "Security & IAM",
    text: "Amazon Cognito is used to add user sign-up, sign-in, and access control to web and mobile apps.",
    answer: true,
    explanation: "Amazon Cognito provides authentication, authorization, and user management for web and mobile applications."
  },
  {
    category: "Security & IAM",
    text: "AWS KMS (Key Management Service) allows you to create and control encryption keys.",
    answer: true,
    explanation: "AWS KMS is a managed service for creating and managing cryptographic keys used to protect your data across AWS services."
  },

  // Scalability & High Availability
  {
    category: "Scalability",
    text: "AWS Auto Scaling can only scale EC2 instances and does not support other services.",
    answer: false,
    explanation: "AWS Auto Scaling supports EC2, ECS, DynamoDB, Aurora, and more — not just EC2 instances."
  },
  {
    category: "Scalability",
    text: "An Application Load Balancer (ALB) operates at Layer 7 (HTTP/HTTPS) of the OSI model.",
    answer: true,
    explanation: "ALB operates at the application layer (Layer 7) and supports path-based routing, host-based routing, and other HTTP/HTTPS features."
  },
  {
    category: "Scalability",
    text: "Amazon CloudFront is a Content Delivery Network (CDN) service that caches content at edge locations worldwide.",
    answer: true,
    explanation: "CloudFront is AWS's CDN service with a global network of edge locations that cache and deliver content with low latency."
  },

  // Billing & Pricing
  {
    category: "Billing",
    text: "AWS charges for incoming data transfer (ingress) into AWS from the internet.",
    answer: false,
    explanation: "Data transfer INTO AWS (ingress) from the internet is generally free. AWS charges for data transfer OUT (egress) to the internet."
  },
  {
    category: "Billing",
    text: "AWS Organizations allows you to consolidate billing for multiple AWS accounts.",
    answer: true,
    explanation: "AWS Organizations lets you manage multiple AWS accounts centrally, including consolidated billing so you receive one bill for all accounts."
  },
  {
    category: "Billing",
    text: "The AWS Free Tier expires after 12 months for all services.",
    answer: false,
    explanation: "The Free Tier includes 12-month free offers (e.g., EC2, S3), always-free offers (e.g., Lambda, DynamoDB limited usage), and short-term trials."
  },

  // Monitoring & Management
  {
    category: "Monitoring",
    text: "Amazon CloudWatch can be used to monitor AWS resources and set alarms based on metrics.",
    answer: true,
    explanation: "CloudWatch collects monitoring data, provides actionable insights, and lets you set alarms to trigger automated actions."
  },
  {
    category: "Monitoring",
    text: "AWS CloudTrail records API calls made in your AWS account for governance, compliance, and auditing.",
    answer: true,
    explanation: "CloudTrail logs all API activity in your AWS account, providing an event history for security analysis and compliance auditing."
  }
];

/* ── State ────────────────────────────────────────────────── */
let shuffled = [];
let currentIndex = 0;
let score = 0;
let userAnswers = [];

/* ── Init ─────────────────────────────────────────────────── */
document.getElementById("total-count").textContent = questions.length;

/* ── Helpers ──────────────────────────────────────────────── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* ── Quiz flow ────────────────────────────────────────────── */
function startQuiz() {
  shuffled = shuffle(questions);
  currentIndex = 0;
  score = 0;
  userAnswers = [];
  showScreen("quiz-screen");
  renderQuestion();
}

function renderQuestion() {
  const q = shuffled[currentIndex];
  const total = shuffled.length;

  // Progress
  document.getElementById("progress-bar").style.width =
    `${(currentIndex / total) * 100}%`;
  document.getElementById("question-counter").textContent =
    `Question ${currentIndex + 1} of ${total}`;
  document.getElementById("score-tracker").textContent =
    `Score: ${score}`;

  // Content
  document.getElementById("category-tag").textContent = q.category;
  document.getElementById("question-text").textContent = q.text;

  // Reset UI
  const btnTrue  = document.getElementById("btn-true");
  const btnFalse = document.getElementById("btn-false");
  const feedback = document.getElementById("feedback");
  const nextBtn  = document.getElementById("next-btn");

  btnTrue.disabled  = false;
  btnFalse.disabled = false;
  btnTrue.classList.remove("selected");
  btnFalse.classList.remove("selected");
  feedback.classList.add("hidden");
  feedback.className = "feedback hidden";
  nextBtn.classList.add("hidden");
}

function submitAnswer(userAnswer) {
  const q = shuffled[currentIndex];
  const correct = userAnswer === q.answer;

  if (correct) score++;

  userAnswers.push({ question: q, userAnswer, correct });

  // Highlight selected button
  const btnTrue  = document.getElementById("btn-true");
  const btnFalse = document.getElementById("btn-false");
  btnTrue.disabled  = true;
  btnFalse.disabled = true;

  if (userAnswer === true)  btnTrue.classList.add("selected");
  else                       btnFalse.classList.add("selected");

  // Feedback
  const feedback = document.getElementById("feedback");
  feedback.classList.remove("hidden", "correct", "incorrect");
  feedback.classList.add(correct ? "correct" : "incorrect");
  feedback.innerHTML = correct
    ? `<strong>✅ Correct!</strong> ${q.explanation}`
    : `<strong>❌ Incorrect.</strong> The answer is <strong>${q.answer ? "True" : "False"}</strong>. ${q.explanation}`;

  document.getElementById("next-btn").classList.remove("hidden");
  document.getElementById("next-btn").textContent =
    currentIndex + 1 < shuffled.length ? "Next →" : "See Results";
}

function nextQuestion() {
  currentIndex++;
  if (currentIndex < shuffled.length) {
    renderQuestion();
  } else {
    showResults();
  }
}

/* ── Results ──────────────────────────────────────────────── */
function showResults() {
  const total = shuffled.length;
  const pct   = Math.round((score / total) * 100);

  // Icon & title
  let icon, title, subtitle;
  if (pct === 100) {
    icon = "🏆"; title = "Perfect Score!"; subtitle = "You're an AWS expert!";
  } else if (pct >= 80) {
    icon = "🌟"; title = "Excellent Work!"; subtitle = "You have solid AWS knowledge.";
  } else if (pct >= 60) {
    icon = "👍"; title = "Good Job!"; subtitle = "Keep studying to master AWS.";
  } else if (pct >= 40) {
    icon = "📚"; title = "Keep Learning!"; subtitle = "Review the AWS docs to improve.";
  } else {
    icon = "💪"; title = "Don't Give Up!"; subtitle = "Study the basics and try again.";
  }

  document.getElementById("result-icon").textContent   = icon;
  document.getElementById("result-title").textContent  = title;
  document.getElementById("result-subtitle").textContent = subtitle;
  document.getElementById("score-display").textContent = score;
  document.getElementById("total-display").textContent = total;
  document.getElementById("score-percent").textContent = `${pct}% correct`;

  // Score bar
  const bar = document.getElementById("score-bar");
  bar.style.background = pct >= 80
    ? "linear-gradient(90deg,#2ECC71,#27AE60)"
    : pct >= 50
      ? "linear-gradient(90deg,#F39C12,#E67E22)"
      : "linear-gradient(90deg,#E74C3C,#C0392B)";
  setTimeout(() => { bar.style.width = pct + "%"; }, 100);

  // Review list
  const list = document.getElementById("review-list");
  list.innerHTML = userAnswers.map(({ question: q, userAnswer, correct }) => `
    <div class="review-item ${correct ? "correct-item" : "wrong-item"}">
      <span class="review-icon">${correct ? "✅" : "❌"}</span>
      <div>
        <strong>${q.text}</strong><br/>
        <small>
          Your answer: <em>${userAnswer ? "True" : "False"}</em> &nbsp;|&nbsp;
          Correct: <em>${q.answer ? "True" : "False"}</em>
        </small>
      </div>
    </div>
  `).join("");

  // Update progress bar to 100%
  document.getElementById("progress-bar").style.width = "100%";

  showScreen("results-screen");
}

function restartQuiz() {
  showScreen("start-screen");
}

/* ── Event listeners ──────────────────────────────────────── */
document.getElementById("start-btn").addEventListener("click", startQuiz);
