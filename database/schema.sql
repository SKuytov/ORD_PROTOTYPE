-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Mar 15, 2026 at 01:08 PM
-- Server version: 8.0.45-0ubuntu0.24.04.1
-- PHP Version: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `partpulse_orders`
--

-- --------------------------------------------------------

--
-- Table structure for table `approvals`
--

CREATE TABLE `approvals` (
  `id` int NOT NULL,
  `order_id` int NOT NULL,
  `quote_document_id` int DEFAULT NULL,
  `requested_by` int NOT NULL,
  `requested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_to` int DEFAULT NULL,
  `status` enum('pending','approved','rejected','cancelled') DEFAULT 'pending',
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `comments` text,
  `rejection_reason` text,
  `estimated_cost` decimal(10,2) DEFAULT NULL,
  `supplier_id` int DEFAULT NULL,
  `priority` enum('Low','Normal','High','Urgent') DEFAULT 'Normal'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `approval_history`
--

CREATE TABLE `approval_history` (
  `id` int NOT NULL,
  `approval_id` int NOT NULL,
  `action` enum('created','approved','rejected','cancelled','reassigned','commented') NOT NULL,
  `performed_by` int NOT NULL,
  `performed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) DEFAULT NULL,
  `comments` text,
  `metadata` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `buildings`
--

CREATE TABLE `buildings` (
  `id` int NOT NULL,
  `code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `communications`
--

CREATE TABLE `communications` (
  `id` int NOT NULL,
  `order_id` int NOT NULL,
  `direction` enum('outgoing','incoming') COLLATE utf8mb4_unicode_ci NOT NULL,
  `communication_type` enum('quote_request','quote_received','quote_follow_up','po_sent','approval_request','approval_received','delivery_confirmation','invoice_received','general') COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `from_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cc_email` text COLLATE utf8mb4_unicode_ci COMMENT 'Comma-separated CC emails',
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `sent_by` int DEFAULT NULL COMMENT 'User who sent/logged this communication',
  `has_attachments` tinyint(1) DEFAULT '0',
  `attachment_count` int DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cost_centers`
--

CREATE TABLE `cost_centers` (
  `id` int NOT NULL,
  `building_code` varchar(20) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` int NOT NULL,
  `order_id` int DEFAULT NULL,
  `document_type` enum('quote_request','quote_pdf','proforma_invoice','purchase_order','invoice','delivery_note','signed_delivery_note','packing_list','customs_declaration','intrastat_declaration','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by` int NOT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `metadata` json DEFAULT NULL COMMENT 'Store supplier info, invoice numbers, amounts, dates, etc.',
  `requires_action` tinyint(1) DEFAULT '0' COMMENT 'Does this document need follow-up?',
  `action_deadline` date DEFAULT NULL COMMENT 'When does action need to be completed?',
  `action_notes` text COLLATE utf8mb4_unicode_ci COMMENT 'What action is required?',
  `status` enum('pending','processed','sent_to_accounting','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `processed_at` timestamp NULL DEFAULT NULL,
  `processed_by` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Additional notes about this document',
  `description` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `eu_deliveries`
--

CREATE TABLE `eu_deliveries` (
  `id` int NOT NULL,
  `order_id` int NOT NULL,
  `supplier_id` int DEFAULT NULL,
  `supplier_country` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ISO 2-letter country code',
  `delivery_date` date NOT NULL,
  `delivery_confirmed_by` int DEFAULT NULL,
  `delivery_confirmed_at` timestamp NULL DEFAULT NULL,
  `intrastat_deadline` date NOT NULL COMMENT 'Auto-calculated: delivery_date + 14 days',
  `intrastat_declared` tinyint(1) DEFAULT '0',
  `intrastat_declared_date` date DEFAULT NULL,
  `intrastat_declared_by` int DEFAULT NULL,
  `delivery_note_signed` tinyint(1) DEFAULT '0' COMMENT 'Has delivery note been signed and returned?',
  `delivery_note_returned_date` date DEFAULT NULL,
  `invoice_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_amount` decimal(10,2) DEFAULT NULL,
  `invoice_currency` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'EUR',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` int NOT NULL,
  `invoice_number` varchar(100) DEFAULT NULL,
  `po_id` int DEFAULT NULL,
  `quote_id` int DEFAULT NULL,
  `supplier_id` int NOT NULL,
  `received_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `received_by` int NOT NULL,
  `invoice_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'EUR',
  `amount` decimal(12,2) DEFAULT NULL,
  `vat_amount` decimal(12,2) DEFAULT '0.00',
  `total_amount` decimal(12,2) DEFAULT NULL,
  `status` enum('received','verified','sent_to_accounting','booked','paid','disputed') DEFAULT 'received',
  `sent_to_accounting_at` timestamp NULL DEFAULT NULL,
  `sent_to_accounting_by` int DEFAULT NULL,
  `accounting_notes` text,
  `booking_reference` varchar(255) DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `document_id` int DEFAULT NULL,
  `notes` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int NOT NULL,
  `building` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cost_center_id` int DEFAULT NULL,
  `item_description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int NOT NULL,
  `date_needed` date NOT NULL,
  `expected_delivery_date` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `supplier_notes` text COLLATE utf8mb4_unicode_ci,
  `alternative_product_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alternative_product_description` text COLLATE utf8mb4_unicode_ci,
  `priority` enum('Low','Normal','High','Urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'Normal',
  `requester_id` int NOT NULL,
  `requester_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requester_email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('New','Pending','Quote Requested','Quote Received','Quote Under Approval','Approved','Ordered','In Transit','Partially Delivered','Delivered','Cancelled','On Hold') COLLATE utf8mb4_unicode_ci DEFAULT 'New',
  `supplier` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_id` int DEFAULT NULL,
  `quote_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quote_ref` int DEFAULT NULL,
  `price` decimal(10,2) DEFAULT '0.00',
  `unit_price` decimal(10,2) DEFAULT '0.00',
  `total_price` decimal(12,2) DEFAULT '0.00',
  `assigned_to` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submission_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `assigned_to_user_id` int DEFAULT NULL COMMENT 'User currently assigned to process this order',
  `assigned_at` datetime DEFAULT NULL COMMENT 'When order was assigned',
  `last_activity_at` datetime DEFAULT NULL COMMENT 'Last time order was edited (for auto-release)',
  `assignment_notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Notes about assignment',
  `po_id` int DEFAULT NULL,
  `po_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_id` int DEFAULT NULL,
  `delivery_confirmed_at` timestamp NULL DEFAULT NULL,
  `delivery_confirmed_by` int DEFAULT NULL,
  `approval_status` enum('not_required','pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'not_required',
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_assignment_history`
--

CREATE TABLE `order_assignment_history` (
  `id` int NOT NULL,
  `order_id` int NOT NULL,
  `assigned_from_user_id` int DEFAULT NULL COMMENT 'Previous assignee (NULL if was unassigned)',
  `assigned_to_user_id` int DEFAULT NULL COMMENT 'New assignee (NULL if releasing)',
  `assigned_by_user_id` int DEFAULT NULL COMMENT 'Who performed the action',
  `assignment_type` enum('claim','release','reassign','auto_release') NOT NULL,
  `reason` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Tracks order assignment history';

-- --------------------------------------------------------

--
-- Table structure for table `order_documents_link`
--

CREATE TABLE `order_documents_link` (
  `id` int NOT NULL,
  `order_id` int NOT NULL,
  `document_id` int NOT NULL,
  `linked_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `linked_by` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_files`
--

CREATE TABLE `order_files` (
  `id` int NOT NULL,
  `order_id` int NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_history`
--

CREATE TABLE `order_history` (
  `id` int NOT NULL,
  `order_id` int NOT NULL,
  `changed_by` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `field_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_value` text COLLATE utf8mb4_unicode_ci,
  `new_value` text COLLATE utf8mb4_unicode_ci,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `po_items`
--

CREATE TABLE `po_items` (
  `id` int NOT NULL,
  `po_id` int NOT NULL,
  `order_id` int DEFAULT NULL,
  `quote_item_id` int DEFAULT NULL,
  `item_description` text NOT NULL,
  `part_number` varchar(255) DEFAULT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(12,4) DEFAULT NULL,
  `total_price` decimal(12,4) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'EUR',
  `received_quantity` int DEFAULT '0',
  `status` enum('pending','partial','received','cancelled') DEFAULT 'pending',
  `notes` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `id` int NOT NULL,
  `po_number` varchar(50) NOT NULL,
  `quote_id` int DEFAULT NULL,
  `supplier_id` int NOT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `currency` varchar(10) DEFAULT 'EUR',
  `total_amount` decimal(12,2) DEFAULT NULL,
  `delivery_address` text,
  `payment_terms` varchar(255) DEFAULT NULL,
  `notes` text,
  `status` enum('draft','sent','confirmed','partially_delivered','delivered','cancelled') DEFAULT 'draft',
  `sent_at` timestamp NULL DEFAULT NULL,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  `expected_delivery_date` date DEFAULT NULL,
  `actual_delivery_date` date DEFAULT NULL,
  `invoice_expected` tinyint(1) DEFAULT '1',
  `invoice_received` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quotes`
--

CREATE TABLE `quotes` (
  `id` int NOT NULL,
  `quote_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_id` int DEFAULT NULL,
  `status` enum('Draft','Sent to Supplier','Received','Under Approval','Approved','Rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'Draft',
  `total_amount` decimal(12,2) DEFAULT '0.00',
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'EUR',
  `valid_until` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quote_items`
--

CREATE TABLE `quote_items` (
  `id` int NOT NULL,
  `quote_id` int NOT NULL,
  `order_id` int NOT NULL,
  `unit_price` decimal(10,2) DEFAULT '0.00',
  `quantity` int NOT NULL DEFAULT '1',
  `total_price` decimal(10,2) DEFAULT '0.00',
  `notes` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quote_responses`
--

CREATE TABLE `quote_responses` (
  `id` int NOT NULL,
  `quote_id` int NOT NULL,
  `quote_item_id` int DEFAULT NULL,
  `order_id` int DEFAULT NULL,
  `responded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `recorded_by` int NOT NULL,
  `unit_price` decimal(12,4) DEFAULT NULL,
  `total_price` decimal(12,4) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'EUR',
  `promised_delivery_date` date DEFAULT NULL,
  `lead_time_days` int DEFAULT NULL,
  `availability` enum('in_stock','available','on_order','unavailable','partial') DEFAULT 'available',
  `moq` int DEFAULT NULL,
  `has_alternative` tinyint(1) DEFAULT '0',
  `alternative_description` text,
  `alternative_unit_price` decimal(12,4) DEFAULT NULL,
  `supplier_notes` text,
  `internal_notes` text,
  `response_document_id` int DEFAULT NULL,
  `status` enum('pending','accepted','rejected','negotiating','countered') DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quote_send_log`
--

CREATE TABLE `quote_send_log` (
  `id` int NOT NULL,
  `quote_id` int NOT NULL,
  `sent_by` int NOT NULL,
  `sent_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `method` enum('outlook','copy','link') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'outlook',
  `supplier_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` int NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_person` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `country` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ISO 2-letter country code',
  `is_eu` tinyint(1) DEFAULT '0' COMMENT 'Is supplier in EU?',
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `specialization` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Primary category/specialization',
  `keywords` text COLLATE utf8mb4_unicode_ci COMMENT 'Searchable keywords for matching',
  `category_tags` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Comma-separated category tags',
  `performance_score` decimal(3,1) DEFAULT '5.0' COMMENT 'Performance rating 0-10',
  `total_orders` int DEFAULT '0' COMMENT 'Total orders placed with this supplier',
  `last_order_date` datetime DEFAULT NULL COMMENT 'Most recent order date'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `supplier_item_history`
--

CREATE TABLE `supplier_item_history` (
  `id` int NOT NULL,
  `order_id` int NOT NULL,
  `supplier_id` int NOT NULL,
  `item_description` text NOT NULL,
  `part_number` varchar(100) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `keywords` text COMMENT 'Extracted keywords for matching',
  `match_quality` enum('exact','good','fair','manual') DEFAULT 'manual',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Learning data for supplier suggestions';

-- --------------------------------------------------------

--
-- Table structure for table `supplier_selection_log`
--

CREATE TABLE `supplier_selection_log` (
  `id` int NOT NULL,
  `order_id` int NOT NULL,
  `supplier_id` int NOT NULL,
  `selected_by_user_id` int NOT NULL,
  `from_suggestion` tinyint(1) DEFAULT '0' COMMENT 'Was this supplier selected from the suggestions?',
  `suggestion_rank` int DEFAULT NULL COMMENT 'If from suggestion, what rank was it (1, 2, or 3)?',
  `selected_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `training_orders`
--

CREATE TABLE `training_orders` (
  `id` int NOT NULL,
  `item_description` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `building` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cost_center` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_id` int NOT NULL,
  `source_file` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_sheet` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `import_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','procurement','requester','manager') COLLATE utf8mb4_unicode_ci NOT NULL,
  `building` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `notification_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_notifications_enabled` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_my_assigned_orders`
-- (See below for the actual view)
--
CREATE TABLE `v_my_assigned_orders` (
`id` int
,`building` varchar(10)
,`cost_center_id` int
,`item_description` text
,`part_number` varchar(100)
,`category` varchar(50)
,`quantity` int
,`date_needed` date
,`expected_delivery_date` date
,`notes` text
,`priority` enum('Low','Normal','High','Urgent')
,`requester_id` int
,`requester_name` varchar(100)
,`requester_email` varchar(100)
,`status` enum('New','Pending','Quote Requested','Quote Received','Quote Under Approval','Approved','Ordered','In Transit','Partially Delivered','Delivered','Cancelled','On Hold')
,`supplier` varchar(100)
,`supplier_id` int
,`quote_id` varchar(50)
,`quote_ref` int
,`price` decimal(10,2)
,`unit_price` decimal(10,2)
,`total_price` decimal(12,2)
,`assigned_to` varchar(50)
,`submission_date` timestamp
,`updated_at` timestamp
,`assigned_to_user_id` int
,`assigned_at` datetime
,`last_activity_at` datetime
,`assignment_notes` text
,`assigned_to_name` varchar(100)
,`assigned_to_username` varchar(50)
,`minutes_since_activity` bigint
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_unassigned_orders`
-- (See below for the actual view)
--
CREATE TABLE `v_unassigned_orders` (
`id` int
,`building` varchar(10)
,`cost_center_id` int
,`item_description` text
,`part_number` varchar(100)
,`category` varchar(50)
,`quantity` int
,`date_needed` date
,`expected_delivery_date` date
,`notes` text
,`priority` enum('Low','Normal','High','Urgent')
,`requester_id` int
,`requester_name` varchar(100)
,`requester_email` varchar(100)
,`status` enum('New','Pending','Quote Requested','Quote Received','Quote Under Approval','Approved','Ordered','In Transit','Partially Delivered','Delivered','Cancelled','On Hold')
,`supplier` varchar(100)
,`supplier_id` int
,`quote_id` varchar(50)
,`quote_ref` int
,`price` decimal(10,2)
,`unit_price` decimal(10,2)
,`total_price` decimal(12,2)
,`assigned_to` varchar(50)
,`submission_date` timestamp
,`updated_at` timestamp
,`assigned_to_user_id` int
,`assigned_at` datetime
,`last_activity_at` datetime
,`assignment_notes` text
);

-- --------------------------------------------------------

--
-- Structure for view `v_my_assigned_orders`
--
DROP TABLE IF EXISTS `v_my_assigned_orders`;

CREATE ALGORITHM=UNDEFINED DEFINER=`partpulse_user`@`localhost` SQL SECURITY DEFINER VIEW `v_my_assigned_orders`  AS SELECT `o`.`id` AS `id`, `o`.`building` AS `building`, `o`.`cost_center_id` AS `cost_center_id`, `o`.`item_description` AS `item_description`, `o`.`part_number` AS `part_number`, `o`.`category` AS `category`, `o`.`quantity` AS `quantity`, `o`.`date_needed` AS `date_needed`, `o`.`expected_delivery_date` AS `expected_delivery_date`, `o`.`notes` AS `notes`, `o`.`priority` AS `priority`, `o`.`requester_id` AS `requester_id`, `o`.`requester_name` AS `requester_name`, `o`.`requester_email` AS `requester_email`, `o`.`status` AS `status`, `o`.`supplier` AS `supplier`, `o`.`supplier_id` AS `supplier_id`, `o`.`quote_id` AS `quote_id`, `o`.`quote_ref` AS `quote_ref`, `o`.`price` AS `price`, `o`.`unit_price` AS `unit_price`, `o`.`total_price` AS `total_price`, `o`.`assigned_to` AS `assigned_to`, `o`.`submission_date` AS `submission_date`, `o`.`updated_at` AS `updated_at`, `o`.`assigned_to_user_id` AS `assigned_to_user_id`, `o`.`assigned_at` AS `assigned_at`, `o`.`last_activity_at` AS `last_activity_at`, `o`.`assignment_notes` AS `assignment_notes`, `u`.`name` AS `assigned_to_name`, `u`.`username` AS `assigned_to_username`, timestampdiff(MINUTE,`o`.`last_activity_at`,now()) AS `minutes_since_activity` FROM (`orders` `o` left join `users` `u` on((`o`.`assigned_to_user_id` = `u`.`id`))) WHERE (`o`.`assigned_to_user_id` is not null) ;

-- --------------------------------------------------------

--
-- Structure for view `v_unassigned_orders`
--
DROP TABLE IF EXISTS `v_unassigned_orders`;

CREATE ALGORITHM=UNDEFINED DEFINER=`partpulse_user`@`localhost` SQL SECURITY DEFINER VIEW `v_unassigned_orders`  AS SELECT `o`.`id` AS `id`, `o`.`building` AS `building`, `o`.`cost_center_id` AS `cost_center_id`, `o`.`item_description` AS `item_description`, `o`.`part_number` AS `part_number`, `o`.`category` AS `category`, `o`.`quantity` AS `quantity`, `o`.`date_needed` AS `date_needed`, `o`.`expected_delivery_date` AS `expected_delivery_date`, `o`.`notes` AS `notes`, `o`.`priority` AS `priority`, `o`.`requester_id` AS `requester_id`, `o`.`requester_name` AS `requester_name`, `o`.`requester_email` AS `requester_email`, `o`.`status` AS `status`, `o`.`supplier` AS `supplier`, `o`.`supplier_id` AS `supplier_id`, `o`.`quote_id` AS `quote_id`, `o`.`quote_ref` AS `quote_ref`, `o`.`price` AS `price`, `o`.`unit_price` AS `unit_price`, `o`.`total_price` AS `total_price`, `o`.`assigned_to` AS `assigned_to`, `o`.`submission_date` AS `submission_date`, `o`.`updated_at` AS `updated_at`, `o`.`assigned_to_user_id` AS `assigned_to_user_id`, `o`.`assigned_at` AS `assigned_at`, `o`.`last_activity_at` AS `last_activity_at`, `o`.`assignment_notes` AS `assignment_notes` FROM `orders` AS `o` WHERE ((`o`.`assigned_to_user_id` is null) AND (`o`.`status` in ('New','Pending','Quote Requested','Quote Received'))) ORDER BY (case `o`.`priority` when 'Urgent' then 1 when 'High' then 2 when 'Normal' then 3 when 'Low' then 4 end) ASC, `o`.`submission_date` ASC ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `approvals`
--
ALTER TABLE `approvals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `quote_document_id` (`quote_document_id`),
  ADD KEY `requested_by` (`requested_by`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_order_id` (`order_id`),
  ADD KEY `idx_assigned_to` (`assigned_to`),
  ADD KEY `idx_requested_at` (`requested_at`);

--
-- Indexes for table `approval_history`
--
ALTER TABLE `approval_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `performed_by` (`performed_by`),
  ADD KEY `idx_approval_id` (`approval_id`),
  ADD KEY `idx_performed_at` (`performed_at`);

--
-- Indexes for table `buildings`
--
ALTER TABLE `buildings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_code` (`code`),
  ADD KEY `idx_active` (`active`);

--
-- Indexes for table `communications`
--
ALTER TABLE `communications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sent_by` (`sent_by`),
  ADD KEY `idx_order_id` (`order_id`),
  ADD KEY `idx_direction` (`direction`),
  ADD KEY `idx_communication_type` (`communication_type`),
  ADD KEY `idx_sent_at` (`sent_at`);

--
-- Indexes for table `cost_centers`
--
ALTER TABLE `cost_centers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_building_cc` (`building_code`,`code`),
  ADD KEY `idx_building` (`building_code`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uploaded_by` (`uploaded_by`),
  ADD KEY `processed_by` (`processed_by`),
  ADD KEY `idx_order_id` (`order_id`),
  ADD KEY `idx_document_type` (`document_type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_action_deadline` (`action_deadline`),
  ADD KEY `idx_uploaded_at` (`uploaded_at`),
  ADD KEY `idx_documents_uploaded_at` (`uploaded_at` DESC),
  ADD KEY `idx_documents_type` (`document_type`);

--
-- Indexes for table `eu_deliveries`
--
ALTER TABLE `eu_deliveries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `delivery_confirmed_by` (`delivery_confirmed_by`),
  ADD KEY `intrastat_declared_by` (`intrastat_declared_by`),
  ADD KEY `idx_order_id` (`order_id`),
  ADD KEY `idx_supplier_country` (`supplier_country`),
  ADD KEY `idx_delivery_date` (`delivery_date`),
  ADD KEY `idx_intrastat_deadline` (`intrastat_deadline`),
  ADD KEY `idx_intrastat_declared` (`intrastat_declared`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `received_by` (`received_by`),
  ADD KEY `sent_to_accounting_by` (`sent_to_accounting_by`),
  ADD KEY `idx_po_id` (`po_id`),
  ADD KEY `idx_quote_id` (`quote_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `requester_id` (`requester_id`),
  ADD KEY `idx_building` (`building`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_assigned_to` (`assigned_to`),
  ADD KEY `idx_submission_date` (`submission_date`),
  ADD KEY `idx_priority` (`priority`),
  ADD KEY `idx_supplier_id` (`supplier_id`),
  ADD KEY `quote_ref` (`quote_ref`),
  ADD KEY `idx_cost_center` (`cost_center_id`),
  ADD KEY `fk_orders_assigned_user` (`assigned_to_user_id`),
  ADD KEY `idx_last_activity` (`last_activity_at`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `idx_orders_approval_status` (`approval_status`);

--
-- Indexes for table `order_assignment_history`
--
ALTER TABLE `order_assignment_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `assigned_from_user_id` (`assigned_from_user_id`),
  ADD KEY `assigned_to_user_id` (`assigned_to_user_id`),
  ADD KEY `assigned_by_user_id` (`assigned_by_user_id`),
  ADD KEY `idx_order_id` (`order_id`),
  ADD KEY `idx_assignment_type` (`assignment_type`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `order_documents_link`
--
ALTER TABLE `order_documents_link`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_order_document` (`order_id`,`document_id`),
  ADD KEY `linked_by` (`linked_by`),
  ADD KEY `idx_order_id` (`order_id`),
  ADD KEY `idx_document_id` (`document_id`);

--
-- Indexes for table `order_files`
--
ALTER TABLE `order_files`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_id` (`order_id`);

--
-- Indexes for table `order_history`
--
ALTER TABLE `order_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_id` (`order_id`),
  ADD KEY `idx_changed_at` (`changed_at`);

--
-- Indexes for table `po_items`
--
ALTER TABLE `po_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `quote_item_id` (`quote_item_id`),
  ADD KEY `idx_po_id` (`po_id`);

--
-- Indexes for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `po_number` (`po_number`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_quote_id` (`quote_id`),
  ADD KEY `idx_supplier_id` (`supplier_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `quotes`
--
ALTER TABLE `quotes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `quote_number` (`quote_number`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_quote_number` (`quote_number`),
  ADD KEY `idx_supplier` (`supplier_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `quote_items`
--
ALTER TABLE `quote_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_quote` (`quote_id`),
  ADD KEY `idx_order` (`order_id`);

--
-- Indexes for table `quote_responses`
--
ALTER TABLE `quote_responses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `quote_item_id` (`quote_item_id`),
  ADD KEY `recorded_by` (`recorded_by`),
  ADD KEY `idx_quote_id` (`quote_id`),
  ADD KEY `idx_order_id` (`order_id`);

--
-- Indexes for table `quote_send_log`
--
ALTER TABLE `quote_send_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sent_by` (`sent_by`),
  ADD KEY `idx_quote_send_log_quote_id` (`quote_id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_active` (`active`),
  ADD KEY `idx_is_eu` (`is_eu`),
  ADD KEY `idx_specialization` (`specialization`);

--
-- Indexes for table `supplier_item_history`
--
ALTER TABLE `supplier_item_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `idx_supplier_id` (`supplier_id`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_part_number` (`part_number`);
ALTER TABLE `supplier_item_history` ADD FULLTEXT KEY `idx_keywords` (`keywords`,`item_description`);

--
-- Indexes for table `supplier_selection_log`
--
ALTER TABLE `supplier_selection_log`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_order_selection` (`order_id`),
  ADD KEY `selected_by_user_id` (`selected_by_user_id`),
  ADD KEY `idx_supplier_learning` (`supplier_id`,`order_id`),
  ADD KEY `idx_selected_at` (`selected_at`);

--
-- Indexes for table `training_orders`
--
ALTER TABLE `training_orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_item_desc` (`item_description`(255)),
  ADD KEY `idx_supplier` (`supplier_id`),
  ADD KEY `idx_building` (`building`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_building` (`building`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `approvals`
--
ALTER TABLE `approvals`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `approval_history`
--
ALTER TABLE `approval_history`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `buildings`
--
ALTER TABLE `buildings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `communications`
--
ALTER TABLE `communications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cost_centers`
--
ALTER TABLE `cost_centers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `eu_deliveries`
--
ALTER TABLE `eu_deliveries`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_assignment_history`
--
ALTER TABLE `order_assignment_history`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_documents_link`
--
ALTER TABLE `order_documents_link`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_files`
--
ALTER TABLE `order_files`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_history`
--
ALTER TABLE `order_history`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `po_items`
--
ALTER TABLE `po_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quotes`
--
ALTER TABLE `quotes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quote_items`
--
ALTER TABLE `quote_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quote_responses`
--
ALTER TABLE `quote_responses`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quote_send_log`
--
ALTER TABLE `quote_send_log`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `supplier_item_history`
--
ALTER TABLE `supplier_item_history`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `supplier_selection_log`
--
ALTER TABLE `supplier_selection_log`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `training_orders`
--
ALTER TABLE `training_orders`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `approvals`
--
ALTER TABLE `approvals`
  ADD CONSTRAINT `approvals_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `approvals_ibfk_2` FOREIGN KEY (`quote_document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `approvals_ibfk_3` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `approvals_ibfk_4` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `approvals_ibfk_5` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `approvals_ibfk_6` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`);

--
-- Constraints for table `approval_history`
--
ALTER TABLE `approval_history`
  ADD CONSTRAINT `approval_history_ibfk_1` FOREIGN KEY (`approval_id`) REFERENCES `approvals` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `approval_history_ibfk_2` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `communications`
--
ALTER TABLE `communications`
  ADD CONSTRAINT `communications_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `communications_ibfk_2` FOREIGN KEY (`sent_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `documents_ibfk_3` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `eu_deliveries`
--
ALTER TABLE `eu_deliveries`
  ADD CONSTRAINT `eu_deliveries_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `eu_deliveries_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  ADD CONSTRAINT `eu_deliveries_ibfk_3` FOREIGN KEY (`delivery_confirmed_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `eu_deliveries_ibfk_4` FOREIGN KEY (`intrastat_declared_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `invoices_ibfk_2` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `invoices_ibfk_3` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  ADD CONSTRAINT `invoices_ibfk_4` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `invoices_ibfk_5` FOREIGN KEY (`sent_to_accounting_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_assigned_user` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `orders_ibfk_3` FOREIGN KEY (`quote_ref`) REFERENCES `quotes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `orders_ibfk_4` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `orders_ibfk_5` FOREIGN KEY (`quote_ref`) REFERENCES `quotes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `orders_ibfk_6` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `order_assignment_history`
--
ALTER TABLE `order_assignment_history`
  ADD CONSTRAINT `order_assignment_history_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_assignment_history_ibfk_2` FOREIGN KEY (`assigned_from_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `order_assignment_history_ibfk_3` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `order_assignment_history_ibfk_4` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `order_documents_link`
--
ALTER TABLE `order_documents_link`
  ADD CONSTRAINT `order_documents_link_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_documents_link_ibfk_2` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_documents_link_ibfk_3` FOREIGN KEY (`linked_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `order_files`
--
ALTER TABLE `order_files`
  ADD CONSTRAINT `order_files_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `order_history`
--
ALTER TABLE `order_history`
  ADD CONSTRAINT `order_history_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `po_items`
--
ALTER TABLE `po_items`
  ADD CONSTRAINT `po_items_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `po_items_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `po_items_ibfk_3` FOREIGN KEY (`quote_item_id`) REFERENCES `quote_items` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  ADD CONSTRAINT `purchase_orders_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `quotes`
--
ALTER TABLE `quotes`
  ADD CONSTRAINT `quotes_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `quotes_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `quote_items`
--
ALTER TABLE `quote_items`
  ADD CONSTRAINT `quote_items_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `quote_items_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `quote_responses`
--
ALTER TABLE `quote_responses`
  ADD CONSTRAINT `quote_responses_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `quote_responses_ibfk_2` FOREIGN KEY (`quote_item_id`) REFERENCES `quote_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `quote_responses_ibfk_3` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `quote_responses_ibfk_4` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `quote_send_log`
--
ALTER TABLE `quote_send_log`
  ADD CONSTRAINT `quote_send_log_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `quote_send_log_ibfk_2` FOREIGN KEY (`sent_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `supplier_item_history`
--
ALTER TABLE `supplier_item_history`
  ADD CONSTRAINT `supplier_item_history_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `supplier_item_history_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `supplier_selection_log`
--
ALTER TABLE `supplier_selection_log`
  ADD CONSTRAINT `supplier_selection_log_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `supplier_selection_log_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `supplier_selection_log_ibfk_3` FOREIGN KEY (`selected_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `training_orders`
--
ALTER TABLE `training_orders`
  ADD CONSTRAINT `training_orders_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
